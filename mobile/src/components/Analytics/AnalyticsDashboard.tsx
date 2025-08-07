/**
 * Analytics dashboard component showing app metrics, logs, and performance data
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { 
  Card, 
  Text, 
  Button, 
  Chip, 
  SegmentedButtons,
  DataTable,
  Surface,
  Divider 
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { loggingService } from '../../services/loggingService';
import { performanceService } from '../../services/performanceService';
import { securityService } from '../../services/securityService';

interface AnalyticsData {
  logs: any[];
  performance: any;
  security: any[];
  system: any;
}

export default function AnalyticsDashboard() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState<AnalyticsData>({
    logs: [],
    performance: {},
    security: [],
    system: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const [logs, performance, security, system] = await Promise.all([
        loggingService.getLogs({ limit: 100 }),
        performanceService.getPerformanceSummary(),
        securityService.getSecurityEvents({ limit: 50 }),
        loggingService.getSystemMetrics()
      ]);

      setData({
        logs,
        performance,
        security,
        system
      });
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearData = async (type: string) => {
    try {
      switch (type) {
        case 'logs':
          await loggingService.clearLogs();
          break;
        case 'performance':
          performanceService.clearMetrics();
          break;
        case 'security':
          await securityService.clearSecurityEvents();
          break;
      }
      await loadAnalyticsData();
    } catch (error) {
      console.error(`Failed to clear ${type} data:`, error);
    }
  };

  const exportData = async () => {
    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        logs: await loggingService.exportLogs(),
        performance: performanceService.exportData(),
        security: await securityService.exportSecurityEvents(),
        system: await loggingService.getSystemMetrics()
      };
      
      console.log('Analytics data exported:', exportData);
      // In a real app, you would save this to a file or send to a server
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  const renderOverview = () => (
    <ScrollView style={styles.tabContent}>
      <Card style={styles.card}>
        <Card.Title title="System Overview" />
        <Card.Content>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Total Logs:</Text>
            <Chip mode="flat">{data.logs.length}</Chip>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Performance Metrics:</Text>
            <Chip mode="flat">{data.performance.totalMetrics || 0}</Chip>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Security Events:</Text>
            <Chip mode="flat">{data.security.length}</Chip>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Average Network Time:</Text>
            <Chip mode="flat">{Math.round(data.performance.averageNetworkTime || 0)}ms</Chip>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="System Information" />
        <Card.Content>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>App Version:</Text>
            <Text>{data.system.appVersion || 'N/A'}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Platform:</Text>
            <Text>{data.system.platform || 'N/A'}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Memory Usage:</Text>
            <Text>{data.system.memoryUsage ? `${Math.round(data.system.memoryUsage.used / 1024 / 1024)}MB` : 'N/A'}</Text>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );

  const renderLogs = () => (
    <View style={styles.tabContent}>
      <View style={styles.tabHeader}>
        <Text variant="titleMedium">Application Logs</Text>
        <Button mode="outlined" onPress={() => clearData('logs')} compact>
          Clear Logs
        </Button>
      </View>
      
      <ScrollView style={styles.scrollContainer}>
        {data.logs.slice(0, 20).map((log, index) => (
          <Surface key={index} style={[styles.logEntry, { 
            borderLeftColor: getLogLevelColor(log.level) 
          }]}>
            <View style={styles.logHeader}>
              <Chip 
                mode="flat" 
                style={[styles.levelChip, { backgroundColor: getLogLevelColor(log.level) + '20' }]}
              >
                {log.level.toUpperCase()}
              </Chip>
              <Text style={styles.logTime}>
                {new Date(log.timestamp).toLocaleTimeString()}
              </Text>
            </View>
            <Text style={styles.logMessage}>{log.message}</Text>
            {log.category && (
              <Text style={styles.logCategory}>Category: {log.category}</Text>
            )}
          </Surface>
        ))}
      </ScrollView>
    </View>
  );

  const renderPerformance = () => (
    <View style={styles.tabContent}>
      <View style={styles.tabHeader}>
        <Text variant="titleMedium">Performance Metrics</Text>
        <Button mode="outlined" onPress={() => clearData('performance')} compact>
          Clear Metrics
        </Button>
      </View>
      
      <ScrollView style={styles.scrollContainer}>
        <Card style={styles.card}>
          <Card.Title title="Component Performance" />
          <Card.Content>
            {data.performance.slowComponents?.length > 0 ? (
              data.performance.slowComponents.map((component: string, index: number) => (
                <Chip key={index} mode="flat" style={styles.performanceChip}>
                  {component}
                </Chip>
              ))
            ) : (
              <Text style={styles.emptyText}>No slow components detected</Text>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Network Performance" />
          <Card.Content>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Average Response Time:</Text>
              <Text>{Math.round(data.performance.averageNetworkTime || 0)}ms</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Total Network Requests:</Text>
              <Text>{data.performance.network?.length || 0}</Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
      case 'fatal':
        return '#f44336';
      case 'warn':
        return '#ff9800';
      case 'info':
        return '#2196f3';
      case 'debug':
        return '#9e9e9e';
      default:
        return '#757575';
    }
  };

  const tabButtons = [
    { value: 'overview', label: 'Overview' },
    { value: 'logs', label: 'Logs' },
    { value: 'performance', label: 'Performance' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall">Analytics Dashboard</Text>
        <Button mode="contained" onPress={exportData} compact>
          Export Data
        </Button>
      </View>

      <SegmentedButtons
        value={activeTab}
        onValueChange={setActiveTab}
        buttons={tabButtons}
        style={styles.segmentedButtons}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text>Loading analytics data...</Text>
        </View>
      ) : (
        <>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'logs' && renderLogs()}
          {activeTab === 'performance' && renderPerformance()}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  tabContent: {
    flex: 1,
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  card: {
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  metricLabel: {
    fontWeight: '500',
  },
  logEntry: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelChip: {
    height: 24,
  },
  logTime: {
    fontSize: 12,
    color: '#666',
  },
  logMessage: {
    fontWeight: '500',
    marginBottom: 4,
  },
  logCategory: {
    fontSize: 12,
    color: '#888',
  },
  performanceChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});