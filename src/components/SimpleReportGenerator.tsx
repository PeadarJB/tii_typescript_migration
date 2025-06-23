// src/components/SimpleReportGenerator.tsx - Refactored with consolidated styling

import { useState, FC } from 'react';
import { Modal, Button, Space, Spin, message, Card, Divider } from 'antd';
import { DownloadOutlined, FileTextOutlined, CameraOutlined } from '@ant-design/icons';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Store imports
import { useMapState, useFilterState, useStatisticsState } from '@/store/useAppStore';

// Style imports
import { usePanelStyles, useCommonStyles } from '@/styles/styled';

// Type imports
import type { ScenarioStatistics } from '@/types/index';

// Minimal props - only what's truly needed
interface SimpleReportGeneratorProps {
  onClose: () => void;
}

const SimpleReportGenerator: FC<SimpleReportGeneratorProps> = ({ onClose }) => {
  // Style hooks
  const { styles: panelStyles } = usePanelStyles();
  const { theme } = useCommonStyles();
  
  // Store hooks
  const { mapView: view} = useMapState();
  const { currentFilters } = useFilterState();
  const { currentStats: statistics } = useStatisticsState();

  // Local state
  const [generating, setGenerating] = useState(false);
  const [mapScreenshot, setMapScreenshot] = useState<string | null>(null);
  const [captureStep, setCaptureStep] = useState('');

  const captureMap = async (): Promise<string | null> => {
    if (!view) return null;
    
    try {
      setCaptureStep('Capturing map view...');
      
      const elementsToHide = ['.esri-ui-corner', '.ant-card'];
      elementsToHide.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          (el as HTMLElement).style.visibility = 'hidden';
        });
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const screenshotOptions = {
        width: 800,
        height: 600,
      };
      const screenshot = await view.takeScreenshot(screenshotOptions);
      
      elementsToHide.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          (el as HTMLElement).style.visibility = 'visible';
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

  const generatePDF = async (): Promise<void> => {
    try {
      setGenerating(true);

      let mapImage = mapScreenshot;
      if (mapImage === null) {
        mapImage = await captureMap();
        if (mapImage === null) {
          throw new Error('Failed to capture map');
        }
      }

      setCaptureStep('Generating PDF document...');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      pdf.setFontSize(20);
      pdf.text('TII Flood Risk Assessment Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      pdf.setFontSize(10);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      if (mapImage) {
        const contentWidth = pageWidth - (margin * 2);
        pdf.addImage(mapImage, 'PNG', margin, yPosition, contentWidth, contentWidth * 0.75);
        yPosition += contentWidth * 0.75 + 10;
      }

      pdf.setFontSize(14);
      pdf.text('Active Filters', margin, yPosition);
      yPosition += 8;
      pdf.setFontSize(10);

      const activeFilterEntries = Object.entries(currentFilters).filter(([, values]) => Array.isArray(values) && values.length > 0);
      if (activeFilterEntries.length > 0) {
        activeFilterEntries.forEach(([key, values]) => {
          pdf.text(`• ${key}: ${(values as string[]).join(', ')}`, margin + 5, yPosition);
          yPosition += 6;
        });
      } else {
        pdf.text('No filters applied - showing all roads', margin + 5, yPosition);
        yPosition += 6;
      }

      yPosition += 5;

      if (yPosition > pageHeight - 80) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.setFontSize(14);
      pdf.text('Flood Risk Statistics', margin, yPosition);
      yPosition += 8;
      pdf.setFontSize(10);
      
      if (statistics?.scenarios) {
        statistics.scenarios.forEach((scenario: ScenarioStatistics) => {
          if (scenario.scenario === 'rcp45') {
            pdf.text('RCP 4.5 Scenario (10-20 year return period):', margin + 5, yPosition);
          } else {
            pdf.text('RCP 8.5 Scenario (100-200 year return period):', margin + 5, yPosition);
          }
          yPosition += 6;
          
          pdf.text(`  - Affected Length: ${scenario.totalAffected.lengthKm.toFixed(1)} km`, margin + 10, yPosition);
          yPosition += 5;
          pdf.text(`  - Percentage: ${scenario.totalAffected.percentage.toFixed(1)}%`, margin + 10, yPosition);
          yPosition += 5;
          pdf.text(`  - Risk Level: ${scenario.riskLevel.toUpperCase()}`, margin + 10, yPosition);
          yPosition += 8;
        });
      }

      pdf.setFontSize(8);
      pdf.text('This report was automatically generated by the TII Flood Risk Dashboard', pageWidth / 2, pageHeight - 10, { align: 'center' });

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
  
  const getStatValue = (scenarioType: 'rcp45' | 'rcp85', metric: 'lengthKm' | 'percentage'): number => {
      const scenario = statistics?.scenarios.find(s => s.scenario === scenarioType);
      return scenario?.totalAffected[metric] ?? 0;
  };

  return (
    <Modal
      title={<Space><FileTextOutlined /><span>Generate Report</span></Space>}
      open={true}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={generating}>Cancel</Button>,
        <Button key="capture" icon={<CameraOutlined />} onClick={() => void captureMap()} disabled={generating || mapScreenshot !== null}>Capture Map</Button>,
        <Button key="generate" type="primary" icon={<DownloadOutlined />} onClick={() => void generatePDF()} loading={generating} disabled={mapScreenshot === null || generating}>Generate PDF</Button>
      ]}
      className={panelStyles.reportModal}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card size="small" className="info-card">
          <p style={{ margin: 0 }}>This will generate a PDF report containing:</p>
          <ul style={{ margin: `${theme.marginXS}px 0 0 0`, paddingLeft: theme.marginLG }}>
            <li>Current map view screenshot</li>
            <li>Active filters summary</li>
            <li>Flood risk statistics</li>
          </ul>
        </Card>

        {mapScreenshot && (
          <>
            <Divider>Map Preview</Divider>
            <div className="map-preview">
              <img src={mapScreenshot} alt="Map preview" />
            </div>
          </>
        )}

        {generating && (
          <div style={{ textAlign: 'center', padding: theme.marginLG }}>
            <Spin size="large" />
            <p style={{ marginTop: theme.margin, color: theme.colorPrimary }}>{captureStep}</p>
          </div>
        )}

        <Divider>Report Content Preview</Divider>
        
        <div style={{ fontSize: theme.fontSizeSM }} className="report-section">
          <strong>Active Filters:</strong>
          <ul style={{ margin: `${theme.marginXXS}px 0`, paddingLeft: theme.marginLG }}>
            {Object.values(currentFilters).some(v => Array.isArray(v) && v.length > 0) ? (
              Object.entries(currentFilters).map(([key, values]) => (
                (Array.isArray(values) && values.length > 0) && <li key={key}>{key}: {values.join(', ')}</li>
              ))
            ) : (
              <li>No filters applied</li>
            )}
          </ul>
        </div>
        
        <div style={{ fontSize: theme.fontSizeSM }} className="report-section">
          <strong>Statistics Summary:</strong>
          {statistics ? (
            <ul style={{ margin: `${theme.marginXXS}px 0`, paddingLeft: theme.marginLG }}>
              <li>Total Network: {(statistics.totalLengthKm).toFixed(1)} km</li>
              <li>RCP 4.5 Impact: {getStatValue('rcp45', 'lengthKm').toFixed(1)} km ({getStatValue('rcp45', 'percentage').toFixed(1)}%)</li>
              <li>RCP 8.5 Impact: {getStatValue('rcp85', 'lengthKm').toFixed(1)} km ({getStatValue('rcp85', 'percentage').toFixed(1)}%)</li>
            </ul>
          ) : (
            <p style={{ margin: `${theme.marginXXS}px 0 0 ${theme.marginLG}px`, color: theme.colorTextSecondary }}>No statistics available</p>
          )}
        </div>
      </Space>
    </Modal>
  );
};

export default SimpleReportGenerator;