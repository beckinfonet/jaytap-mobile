import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { PropertyDetailsScreen } from './src/screens/PropertyDetailsScreen';
import { Tour3DScreen } from './src/screens/Tour3DScreen';
import { TourSelectionScreen } from './src/screens/TourSelectionScreen';
import { ThemeProvider } from './src/theme/ThemeContext';
import { Property } from './src/data/mockProperties';

function App() {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [activeTourUrl, setActiveTourUrl] = useState<string | null>(null);
  const [propertyForTourSelection, setPropertyForTourSelection] = useState<Property | null>(null);

  const handleOpenTours = (property: Property) => {
    if (property.tours && property.tours.length > 0) {
        if (property.tours.length === 1) {
            // Direct open if only 1 tour, OR we could still show preview. 
            // User requirement: "show previews of the 3D tours first". 
            // So we show selection screen even for 1 tour, or generally for > 0.
            setPropertyForTourSelection(property);
        } else {
            setPropertyForTourSelection(property);
        }
    }
  };

  const handleTourSelected = (url: string) => {
      setPropertyForTourSelection(null); // Close selection
      setActiveTourUrl(url); // Open viewer
  };

  const renderContent = () => {
    // Top-most layer: Full screen 3D Viewer
    if (activeTourUrl) {
      return (
        <Tour3DScreen 
          url={activeTourUrl} 
          onClose={() => setActiveTourUrl(null)} 
        />
      );
    }

    return (
      <>
        {selectedProperty ? (
          <PropertyDetailsScreen 
            property={selectedProperty} 
            onBack={() => setSelectedProperty(null)}
            onOpenTours={() => handleOpenTours(selectedProperty)}
          />
        ) : (
          <HomeScreen 
            onSelectProperty={setSelectedProperty} 
            onOpenTours={handleOpenTours}
          />
        )}
        
        {/* Modal Layer: Tour Selection */}
        {propertyForTourSelection && (
            <TourSelectionScreen
                property={propertyForTourSelection}
                onSelectTour={handleTourSelected}
                onClose={() => setPropertyForTourSelection(null)}
            />
        )}
      </>
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
