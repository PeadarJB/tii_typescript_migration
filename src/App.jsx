import React, { useState, useEffect } from 'react';
import { ConfigProvider, App as AntApp, Spin, message } from 'antd';
import { ProConfigProvider } from '@ant-design/pro-components';
import enUS from 'antd/locale/en_US';
import dayjs from 'dayjs';
import 'dayjs/locale/en';
import { theme } from './config/themeConfig';
import MainLayout from './layouts/MainLayout';
import { AppManager } from './core/AppManager';

// Import Ant Design reset CSS
import 'antd/dist/reset.css';
// Import custom global styles
import './styles/global.less';

// Set dayjs locale
dayjs.locale('en');

// Create a single instance of AppManager
const appManager = new AppManager();

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { message: messageApi, notification, modal } = AntApp.useApp();

  useEffect(() => {
    // Initialize the application
    const initializeApp = async () => {
      try {
        setLoading(true);
        await appManager.initialize();
        messageApi.success('Application loaded successfully');
      } catch (err) {
        console.error('Failed to initialize application:', err);
        setError(err.message || 'Failed to initialize application');
        notification.error({
          message: 'Initialization Error',
          description: err.message || 'Failed to initialize application',
          duration: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      appManager.destroy();
    };
  }, []);

  // Global error boundary
  const handleError = (error, errorInfo) => {
    console.error('Global error:', error, errorInfo);
    notification.error({
      message: 'Application Error',
      description: error.toString(),
      duration: 0,
    });
  };

  if (loading) {
    return (
      <ConfigProvider theme={theme} locale={enUS}>
        <div style={{
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: theme.token.colorBgLayout,
        }}>
          <Spin size="large" tip="Loading TII Flood Risk Dashboard..." />
        </div>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider theme={theme} locale={enUS}>
      <ProConfigProvider dark={false}>
        <AntApp
          message={{ maxCount: 3 }}
          notification={{ placement: 'topRight' }}
        >
          <MainLayout appManager={appManager} error={error} />
        </AntApp>
      </ProConfigProvider>
    </ConfigProvider>
  );
}

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ConfigProvider theme={theme} locale={enUS}>
          <div style={{
            height: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: theme.token.colorBgLayout,
            padding: '20px',
          }}>
            <div style={{ textAlign: 'center', maxWidth: '600px' }}>
              <h1 style={{ color: theme.token.colorError }}>Something went wrong</h1>
              <p style={{ color: theme.token.colorTextSecondary, marginBottom: '20px' }}>
                The application encountered an unexpected error.
              </p>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 20px',
                  background: theme.token.colorPrimary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: theme.token.borderRadius,
                  cursor: 'pointer',
                }}
              >
                Reload Application
              </button>
            </div>
          </div>
        </ConfigProvider>
      );
    }

    return this.props.children;
  }
}

// Export wrapped App
export default function WrappedApp() {
  return (
    <ErrorBoundary>
      <AntApp>
        <App />
      </AntApp>
    </ErrorBoundary>
  );
}