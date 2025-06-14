import React, { useState } from 'react';
import { Modal, Button, Space, Spin, message, Card, Divider } from 'antd';
import { DownloadOutlined, FileTextOutlined, CameraOutlined } from '@ant-design/icons';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { CONFIG } from '../config/appConfig';

const SimpleReportGenerator = ({ 
  view, 
  roadLayer, 
  activeFilters, 
  statistics,
  onClose 
}) => {
  const [generating, setGenerating] = useState(false);
  const [mapScreenshot, setMapScreenshot] = useState(null);
  const [captureStep, setCaptureStep] = useState('');

  // Capture map screenshot
  const captureMap = async () => {
    try {
      setCaptureStep('Capturing map view...');
      
      // Hide UI elements temporarily
      const elementsToHide = [
        '.esri-ui-corner',
        '.ant-card',
        '.ant-layout-sider'
      ];
      
      elementsToHide.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          el.style.visibility = 'hidden';
        });
      });

      // Wait a bit for UI to update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Take screenshot using ArcGIS API
      const screenshot = await view.takeScreenshot({
        format: 'png',
        quality: 1,
        width: 800,
        height: 600
      });

      // Restore UI elements
      elementsToHide.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          el.style.visibility = 'visible';
        });
      });

      setMapScreenshot(screenshot.dataUrl);
      return screenshot.dataUrl;
    } catch (error) {
      console.error('Failed to capture map:', error);
      message.error('Failed to capture map screenshot');
      return null;
    }
  };

  // Generate PDF
  const generatePDF = async () => {
    try {
      setGenerating(true);

      // Capture map if not already done
      let mapImage = mapScreenshot;
      if (!mapImage) {
        mapImage = await captureMap();
        if (!mapImage) {
          throw new Error('Failed to capture map');
        }
      }

      setCaptureStep('Generating PDF document...');

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Title
      pdf.setFontSize(20);
      pdf.text('TII Flood Risk Assessment Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Date
      pdf.setFontSize(10);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Map Image
      if (mapImage) {
        pdf.addImage(mapImage, 'PNG', margin, yPosition, contentWidth, contentWidth * 0.75);
        yPosition += contentWidth * 0.75 + 10;
      }

      // Active Filters Section
      pdf.setFontSize(14);
      pdf.text('Active Filters', margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      if (activeFilters && Object.keys(activeFilters).length > 0) {
        Object.entries(activeFilters).forEach(([key, values]) => {
          if (values && values.length > 0) {
            pdf.text(`• ${key}: ${values.join(', ')}`, margin + 5, yPosition);
            yPosition += 6;
          }
        });
      } else {
        pdf.text('No filters applied - showing all roads', margin + 5, yPosition);
        yPosition += 6;
      }

      yPosition += 5;

      // Check if we need a new page
      if (yPosition > pageHeight - 80) {
        pdf.addPage();
        yPosition = margin;
      }

      // Statistics Section
      pdf.setFontSize(14);
      pdf.text('Flood Risk Statistics', margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      if (statistics) {
        // Total Network
        pdf.text(`Total Road Network: ${statistics.total.length.toFixed(1)} km (${statistics.total.segments.toLocaleString()} segments)`, margin + 5, yPosition);
        yPosition += 8;

        // RCP 4.5
        pdf.text('RCP 4.5 Scenario (10-20 year return period):', margin + 5, yPosition);
        yPosition += 6;
        pdf.text(`  - Affected Length: ${statistics.rcp45.length.toFixed(1)} km`, margin + 10, yPosition);
        yPosition += 5;
        pdf.text(`  - Percentage: ${statistics.rcp45.percent.toFixed(1)}%`, margin + 10, yPosition);
        yPosition += 8;

        // RCP 8.5
        pdf.text('RCP 8.5 Scenario (100-200 year return period):', margin + 5, yPosition);
        yPosition += 6;
        pdf.text(`  - Affected Length: ${statistics.rcp85.length.toFixed(1)} km`, margin + 10, yPosition);
        yPosition += 5;
        pdf.text(`  - Percentage: ${statistics.rcp85.percent.toFixed(1)}%`, margin + 10, yPosition);
        yPosition += 10;
      }

      // Footer
      pdf.setFontSize(8);
      pdf.text('This report was automatically generated by the TII Flood Risk Dashboard', pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Save PDF
      pdf.save(`TII_Flood_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      
      message.success('Report generated successfully!');
      onClose();
    } catch (error) {
      console.error('Failed to generate report:', error);
      message.error('Failed to generate report');
    } finally {
      setGenerating(false);
      setCaptureStep('');
    }
  };

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          <span>Generate Report</span>
        </Space>
      }
      open={true}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={generating}>
          Cancel
        </Button>,
        <Button 
          key="capture" 
          icon={<CameraOutlined />}
          onClick={captureMap}
          disabled={generating || mapScreenshot}
        >
          Capture Map
        </Button>,
        <Button
          key="generate"
          type="primary"
          icon={<DownloadOutlined />}
          onClick={generatePDF}
          loading={generating}
          disabled={!mapScreenshot && !generating}
        >
          Generate PDF
        </Button>
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* Instructions */}
        <Card size="small" style={{ backgroundColor: '#f0f8ff' }}>
          <p style={{ margin: 0 }}>
            This will generate a PDF report containing:
          </p>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
            <li>Current map view screenshot</li>
            <li>Active filters summary</li>
            <li>Flood risk statistics</li>
          </ul>
        </Card>

        {/* Map Preview */}
        {mapScreenshot && (
          <>
            <Divider>Map Preview</Divider>
            <div style={{ textAlign: 'center' }}>
              <img 
                src={mapScreenshot} 
                alt="Map preview" 
                style={{ 
                  maxWidth: '100%', 
                  border: '1px solid #d9d9d9',
                  borderRadius: 4
                }} 
              />
            </div>
          </>
        )}

        {/* Generation Progress */}
        {generating && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin size="large" />
            <p style={{ marginTop: 10, color: '#1890ff' }}>{captureStep}</p>
          </div>
        )}

        {/* Current Settings Preview */}
        <Divider>Report Content Preview</Divider>
        
        <div style={{ fontSize: 12 }}>
          <strong>Active Filters:</strong>
          <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
            {activeFilters && Object.entries(activeFilters).map(([key, values]) => (
              values && values.length > 0 && (
                <li key={key}>{key}: {values.join(', ')}</li>
              )
            ))}
            {(!activeFilters || Object.keys(activeFilters).length === 0) && (
              <li>No filters applied</li>
            )}
          </ul>

          <strong>Statistics Summary:</strong>
          {statistics ? (
            <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
              <li>Total Network: {statistics.total.length.toFixed(1)} km</li>
              <li>RCP 4.5 Impact: {statistics.rcp45.length.toFixed(1)} km ({statistics.rcp45.percent.toFixed(1)}%)</li>
              <li>RCP 8.5 Impact: {statistics.rcp85.length.toFixed(1)} km ({statistics.rcp85.percent.toFixed(1)}%)</li>
            </ul>
          ) : (
            <p style={{ margin: '4px 0 0 20px', color: '#999' }}>No statistics available</p>
          )}
        </div>
      </Space>
    </Modal>
  );
};

export default SimpleReportGenerator;