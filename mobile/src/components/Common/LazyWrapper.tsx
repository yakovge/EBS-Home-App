/**
 * Lazy wrapper component for performance optimization
 * Provides loading states and error boundaries for lazy-loaded components
 */

import React, { Suspense, ComponentType, ReactElement } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

interface LazyWrapperProps {
  children: ReactElement;
  fallback?: ReactElement;
  errorFallback?: ReactElement;
  testID?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class LazyErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: ReactElement },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: ReactElement }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LazyWrapper Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <DefaultErrorFallback />;
    }

    return this.props.children;
  }
}

function DefaultLoadingFallback() {
  const { t } = useTranslation();
  
  return (
    <View style={styles.fallback}>
      <ActivityIndicator size="large" />
      <Text style={styles.fallbackText}>{t('common.loading')}</Text>
    </View>
  );
}

function DefaultErrorFallback() {
  const { t } = useTranslation();
  
  return (
    <View style={styles.fallback}>
      <Text style={styles.errorText}>{t('errors.unknownError')}</Text>
    </View>
  );
}

export default function LazyWrapper({
  children,
  fallback,
  errorFallback,
  testID
}: LazyWrapperProps) {
  return (
    <LazyErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback || <DefaultLoadingFallback />}>
        <View style={styles.container} testID={testID}>
          {children}
        </View>
      </Suspense>
    </LazyErrorBoundary>
  );
}

/**
 * Higher-order component to wrap components with lazy loading
 */
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  options?: {
    fallback?: ReactElement;
    errorFallback?: ReactElement;
  }
) {
  const LazyComponent = React.lazy(() => 
    Promise.resolve({ default: Component })
  );

  return function WrappedComponent(props: P) {
    return (
      <LazyWrapper 
        fallback={options?.fallback}
        errorFallback={options?.errorFallback}
      >
        <LazyComponent {...props} />
      </LazyWrapper>
    );
  };
}

/**
 * Create lazy-loaded component from dynamic import
 */
export function createLazyComponent<P extends object>(
  importFunction: () => Promise<{ default: ComponentType<P> }>,
  options?: {
    fallback?: ReactElement;
    errorFallback?: ReactElement;
  }
) {
  const LazyComponent = React.lazy(importFunction);

  return function LazyLoadedComponent(props: P) {
    return (
      <LazyWrapper 
        fallback={options?.fallback}
        errorFallback={options?.errorFallback}
      >
        <LazyComponent {...props} />
      </LazyWrapper>
    );
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  fallbackText: {
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
    color: '#f44336',
  },
});