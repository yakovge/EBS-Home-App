/**
 * Error boundary component to catch and log React errors
 * Provides fallback UI and error reporting
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Button, Card } from 'react-native-paper';
import { loggingService } from '../services/loggingService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to logging service
    loggingService.error('React Error Boundary', 'Component tree error', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // Report to crash analytics in production
    if (!__DEV__) {
      loggingService.fatal('React Error Boundary', 'Production app crash', {
        error: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  handleReset = () => {
    loggingService.info('ErrorBoundary', 'Error boundary reset by user');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.title}>Oops! Something went wrong</Text>
              <Text style={styles.message}>
                We're sorry for the inconvenience. The error has been logged and we'll fix it as soon as possible.
              </Text>
              
              {__DEV__ && this.state.error && (
                <ScrollView style={styles.errorDetails}>
                  <Text style={styles.errorTitle}>Error Details (Dev Only):</Text>
                  <Text style={styles.errorText}>{this.state.error.toString()}</Text>
                  {this.state.error.stack && (
                    <>
                      <Text style={styles.errorTitle}>Stack Trace:</Text>
                      <Text style={styles.errorStack}>{this.state.error.stack}</Text>
                    </>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <>
                      <Text style={styles.errorTitle}>Component Stack:</Text>
                      <Text style={styles.errorStack}>{this.state.errorInfo.componentStack}</Text>
                    </>
                  )}
                </ScrollView>
              )}
            </Card.Content>
            
            <Card.Actions>
              <Button mode="contained" onPress={this.handleReset}>
                Try Again
              </Button>
            </Card.Actions>
          </Card>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  card: {
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#d32f2f',
  },
  message: {
    fontSize: 16,
    marginBottom: 20,
    color: '#666',
  },
  errorDetails: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    maxHeight: 300,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    color: '#333',
  },
  errorText: {
    fontSize: 12,
    color: '#d32f2f',
    fontFamily: 'monospace',
  },
  errorStack: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
  },
});