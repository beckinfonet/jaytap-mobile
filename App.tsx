import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { PropertyDetailsScreen } from './src/screens/PropertyDetailsScreen';
import { Tour3DScreen } from './src/screens/Tour3DScreen';
import { ThemeProvider } from './src/theme/ThemeContext';
import { Property } from './src/data/mockProperties';

function App() {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [activeTourUrl, setActiveTourUrl] = useState<string | null>(null);

  const handleOpenTour = (url: string) => {
    setActiveTourUrl(url);
  };

  const renderContent = () => {
    if (activeTourUrl) {
      return (
        <Tour3DScreen 
          url={activeTourUrl} 
          onClose={() => setActiveTourUrl(null)} 
        />
      );
    }

    if (selectedProperty) {
      return (
        <PropertyDetailsScreen 
          property={selectedProperty} 
          onBack={() => setSelectedProperty(null)}
          onOpenTour={handleOpenTour}
        />
      );
    }

    return (
      <HomeScreen 
        onSelectProperty={setSelectedProperty} 
        onOpenTour={handleOpenTour}
      />
    );
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {renderContent()}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
