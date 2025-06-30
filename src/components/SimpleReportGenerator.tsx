// src/components/SimpleReportGenerator.tsx - Enhanced with theme system and store integration

import { useState, FC } from 'react';
import { Modal, Button, Space, Spin, message, Card, Divider, Table } from 'antd';
import { DownloadOutlined, FileTextOutlined, CameraOutlined } from '@ant-design/icons';
import jsPDF from 'jspdf';
import autoTable, { type RowInput } from 'jspdf-autotable';

// Store imports
import { useMapState, useFilterState, useStatisticsState } from '@/store/useAppStore';

// Style imports
import { usePanelStyles, useCommonStyles } from '@/styles/styled';

// Type imports
import type { ScenarioStatistics, FilterState } from '@/types/index';
import { CONFIG } from '@/config/appConfig';

interface SimpleReportGeneratorProps {
  onClose: () => void;
}

const SimpleReportGenerator: FC<SimpleReportGeneratorProps> = ({ onClose }) => {
  const { styles: panelStyles } = usePanelStyles();
  const { theme } = useCommonStyles();

  const { mapView: view } = useMapState();
  const { currentFilters } = useFilterState();
  const { currentStats: statistics } = useStatisticsState();

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

      const screenshot = await view.takeScreenshot({ 
        width: 800, 
        height: 600,
        quality: 85
      });

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

  /**
   * Gets the display-friendly label for a given filter value.
   */
  const getFilterDisplayValue = (filterId: keyof FilterState, value: string): string => {
    const config = CONFIG.filterConfig.find(f => f.id === filterId);
    if (!config) return value;

    if (config.type === 'multi-select' || config.type === 'single-select') {
      const option = config.options?.find(opt => String(opt.value) === String(value));
      return option?.label ?? value;
    }
    if (config.type === 'scenario-select') {
      const item = config.items?.find(i => i.field === value);
      return item?.label ?? value;
    }
    return value;
  };

  const generatePDF = async (): Promise<void> => {
    try {
      setGenerating(true);

      let mapImage = mapScreenshot;
      if (mapImage === null) {
        mapImage = await captureMap();
        if (mapImage === null) throw new Error('Failed to capture map');
      }

      setCaptureStep('Generating PDF document...');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      let yPosition = margin;

      // Title with TII branding colors
      pdf.setFontSize(20);
      pdf.setTextColor(0, 61, 130); // TII primary blue
      pdf.text('TII Flood Risk Assessment Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;
      
      pdf.setFontSize(10);
      pdf.setTextColor(102, 102, 102); // Secondary text color
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Map Screenshot
      if (mapImage) {
        const contentWidth = pageWidth - (margin * 2);
        const imageHeight = contentWidth * 0.75;
        
        // Add a subtle border around the map
        pdf.setDrawColor(217, 217, 217); // Border color
        pdf.setLineWidth(0.5);
        pdf.rect(margin - 1, yPosition - 1, contentWidth + 2, imageHeight + 2);
        
        pdf.addImage(mapImage, 'PNG', margin, yPosition, contentWidth, imageHeight);
        yPosition += imageHeight + 15;
      }

      // Reset text color for content
      pdf.setTextColor(0, 0, 0);

      // Active Filters Section
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Active Filters', margin, yPosition);
      yPosition += 7;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');

      const activeFilterEntries = Object.entries(currentFilters).filter(([, values]) => Array.isArray(values) && values.length > 0);
      if (activeFilterEntries.length > 0) {
        activeFilterEntries.forEach(([key, values]) => {
          const filterConfig = CONFIG.filterConfig.find(f => f.id === key);
          if (filterConfig) {
            const displayValues = (values as string[]).map(val => getFilterDisplayValue(key as keyof FilterState, val)).join(', ');
            pdf.text(`• ${filterConfig.label}: ${displayValues}`, margin + 2, yPosition);
            yPosition += 6;
          }
        });
      } else {
        pdf.setTextColor(102, 102, 102);
        pdf.text('No filters applied.', margin + 2, yPosition);
        pdf.setTextColor(0, 0, 0);
        yPosition += 6;
      }
      yPosition += 8;

      // Check for page break before table
      if (yPosition > pdf.internal.pageSize.getHeight() - 80) {
        pdf.addPage();
        yPosition = margin;
      }

      // Statistics Table
      if (statistics?.scenarios) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Flood Risk Statistics Summary', margin, yPosition);
        yPosition += 7;

        const tableHead = [['Scenario', 'Flood Model', 'Affected Length (km)', 'Affected Segments']];
        const tableBody: RowInput[] = [];

        statistics.scenarios.forEach((scenario: ScenarioStatistics) => {
          // Add a bold summary row for the scenario
          tableBody.push([
            { content: scenario.title, styles: { fontStyle: 'bold' } },
            { content: 'Total Affected', styles: { fontStyle: 'bold' } },
            { content: scenario.totalAffected.lengthKm.toFixed(1), styles: { fontStyle: 'bold', halign: 'right' } },
            { content: scenario.totalAffected.count.toLocaleString(), styles: { fontStyle: 'bold', halign: 'right' } },
          ] as RowInput);

          // Add breakdown rows
          scenario.modelBreakdown.forEach(model => {
            tableBody.push([
              '', // Empty cell for scenario title
              model.label,
              { content: model.lengthKm.toFixed(1), styles: { halign: 'right' } },
              { content: model.count.toLocaleString(), styles: { halign: 'right' } }
            ] as RowInput);
          });
        });

        autoTable(pdf, {
          head: tableHead,
          body: tableBody,
          startY: yPosition,
          margin: { left: margin, right: margin },
          theme: 'grid',
          headStyles: { 
            fillColor: [0, 61, 130], // TII Blue
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          bodyStyles: {
            fontSize: 9,
            cellPadding: 3,
          },
          alternateRowStyles: {
            fillColor: [248, 248, 248]
          },
          didDrawPage: (data: any) => {
            yPosition = data.cursor?.y ?? yPosition;
          }
        });
      }

      // Add footer with generation info
      const pageCount = pdf.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(102, 102, 102);
        pdf.text(
          `Generated by TII Flood Risk Dashboard - Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pdf.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      const fileName = `TII_Flood_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      message.success('Report generated successfully!');
      onClose();
    } catch (error) {
      console.error('Failed to generate report:', error);
      message.error('Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
      setCaptureStep('');
    }
  };

  const previewStatColumns = [
    { 
      title: 'Scenario', 
      dataIndex: 'scenario', 
      key: 'scenario',
      width: '25%'
    },
    { 
      title: 'Flood Model', 
      dataIndex: 'model', 
      key: 'model',
      width: '35%'
    },
    { 
      title: 'Length (km)', 
      dataIndex: 'length', 
      key: 'length', 
      align: 'right' as const,
      width: '20%'
    },
    { 
      title: 'Segments', 
      dataIndex: 'segments', 
      key: 'segments', 
      align: 'right' as const,
      width: '20%'
    },
  ];

  const previewStatData = statistics?.scenarios?.flatMap((scenario, index) => [
    {
      key: `total-${index}`,
      scenario: scenario.title,
      model: <strong style={{ color: theme.colorPrimary }}>Total Affected</strong>,
      length: <strong>{scenario.totalAffected.lengthKm.toFixed(1)}</strong>,
      segments: <strong>{scenario.totalAffected.count.toLocaleString()}</strong>,
    },
    ...scenario.modelBreakdown.map((model, modelIndex) => ({
      key: `${index}-${modelIndex}`,
      scenario: '',
      model: model.label,
      length: model.lengthKm.toFixed(1),
      segments: model.count.toLocaleString(),
    }))
  ]) ?? [];

  const activeFilterCount = Object.values(currentFilters).filter(
    v => Array.isArray(v) && v.length > 0
  ).length;

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined style={{ color: theme.colorPrimary }} />
          <span>Generate Report</span>
        </Space>
      }
      open={true}
      onCancel={onClose}
      width={700}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={generating}>
          Cancel
        </Button>,
        <Button 
          key="capture" 
          icon={<CameraOutlined />} 
          onClick={() => void captureMap()} 
          disabled={generating || mapScreenshot !== null}
          type={mapScreenshot ? "default" : "dashed"}
        >
          {mapScreenshot ? 'Map Captured' : 'Capture Map'}
        </Button>,
        <Button 
          key="generate" 
          type="primary" 
          icon={<DownloadOutlined />} 
          onClick={() => void generatePDF()} 
          loading={generating} 
          disabled={mapScreenshot === null || generating}
        >
          Generate PDF
        </Button>
      ]}
      className={panelStyles.reportModal}
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card size="small" className="info-card" style={{ 
          backgroundColor: theme.colorPrimaryBg,
          borderColor: theme.colorPrimaryBorder 
        }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <p style={{ margin: 0, fontWeight: 500 }}>
              This will generate a comprehensive PDF report containing:
            </p>
            <ul style={{ 
              margin: `${theme.marginXS}px 0 0 0`, 
              paddingLeft: theme.marginLG,
              color: theme.colorTextSecondary
            }}>
              <li>Current map view screenshot with applied filters</li>
              <li>Summary of active filters ({activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} applied)</li>
              <li>Detailed flood risk statistics and analysis</li>
            </ul>
          </Space>
        </Card>

        {mapScreenshot && (
          <>
            <Divider orientation="left">Map Preview</Divider>
            <div className="map-preview" style={{ textAlign: 'center' }}>
              <img 
                src={mapScreenshot} 
                alt="Map preview" 
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  border: `1px solid ${theme.colorBorder}`,
                  borderRadius: theme.borderRadius,
                  boxShadow: theme.boxShadow
                }}
              />
            </div>
          </>
        )}

        {generating && (
          <div style={{ 
            textAlign: 'center', 
            padding: theme.marginLG,
            backgroundColor: theme.colorBgContainer,
            borderRadius: theme.borderRadius,
            border: `1px dashed ${theme.colorBorder}`
          }}>
            <Spin size="large" />
            <p style={{ 
              marginTop: theme.margin, 
              color: theme.colorPrimary,
              fontWeight: 500
            }}>
              {captureStep}
            </p>
          </div>
        )}

        <Divider orientation="left">Report Content Preview</Divider>

        <div style={{ fontSize: theme.fontSizeSM }} className="report-section">
          <strong style={{ color: theme.colorText }}>Active Filters:</strong>
          <ul style={{ 
            margin: `${theme.marginXXS}px 0`, 
            paddingLeft: theme.marginLG,
            color: theme.colorTextSecondary
          }}>
            {Object.values(currentFilters).some(v => Array.isArray(v) && v.length > 0) ? (
              Object.entries(currentFilters).map(([key, values]) => {
                const config = CONFIG.filterConfig.find(f => f.id === key);
                if (!config || !Array.isArray(values) || values.length === 0) return null;
                const displayValues = values.map(v => getFilterDisplayValue(key as keyof FilterState, String(v))).join(', ');
                return (
                  <li key={key} style={{ marginBottom: theme.marginXXS }}>
                    <strong>{config.label}:</strong> {displayValues}
                  </li>
                );
              })
            ) : (
              <li style={{ color: theme.colorTextTertiary, fontStyle: 'italic' }}>
                No filters applied
              </li>
            )}
          </ul>
        </div>

        <div style={{ fontSize: theme.fontSizeSM }} className="report-section">
          <strong style={{ color: theme.colorText, marginBottom: theme.marginXS, display: 'block' }}>
            Statistics Summary:
          </strong>
          {statistics ? (
            <Table
              columns={previewStatColumns}
              dataSource={previewStatData}
              pagination={false}
              size="small"
              bordered
              style={{ 
                fontSize: theme.fontSizeSM,
                backgroundColor: theme.colorBgContainer
              }}
            />
          ) : (
            <p style={{ 
              margin: `${theme.marginXXS}px 0 0 ${theme.marginLG}px`, 
              color: theme.colorTextSecondary,
              fontStyle: 'italic'
            }}>
              No statistics available. Apply filters to generate statistics.
            </p>
          )}
        </div>
      </Space>
    </Modal>
  );
};

export default SimpleReportGenerator;