import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView, Alert, Modal, FlatList, ActivityIndicator, SafeAreaView, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URLS, COMPANY_CONFIG, APP_CONFIG } from '../config/api';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [metrcTag, setMetrcTag] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [tagDetails, setTagDetails] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [apiData, setApiData] = useState({
    items: [],
    cartMaster: [],
    hanger: [],
    binLocations: []
  });
  const [selectedLocationValue, setSelectedLocationValue] = useState('');

  // Add ref for metrc tag input
  const metrcTagInputRef = useRef(null);

  // Add refs for focus management
  const locationRef = useRef(null);
  const cartRef = useRef(null);
  const hangerRef = useRef(null);
  const numberOfHangersRef = useRef(null);
  const numberOfPlantsRef = useRef(null);
  const harvestNameDetailsRef = useRef(null);
  const grossWeightRef = useRef(null);
  const scrollViewRef = useRef(null);


  // Add state for cart and hanger input validation
  const [cartInputText, setCartInputText] = useState('');
  const [hangerInputText, setHangerInputText] = useState('');

  // Add refs for handling scanner input delays
  const cartSubmitTimeoutRef = useRef(null);
  const hangerSubmitTimeoutRef = useRef(null);
  const harvestSubmitTimeoutRef = useRef(null);

  // Add refs to store current input values for scanner handling
  const currentMetrcTagRef = useRef('');
  const currentCartInputRef = useRef('');
  const currentHangerInputRef = useRef('');


  // Loading state for harvest details fetch
  const [isLoadingHarvestDetails, setIsLoadingHarvestDetails] = useState(false);

  // Loading popup state for harvest name processing
  const [showHarvestNameLoadingModal, setShowHarvestNameLoadingModal] = useState(false);

  // Location dropdown state variables
  const [locationSearchText, setLocationSearchText] = useState('');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [filteredLocations, setFilteredLocations] = useState([]);

  // Submit loading state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batchErrors, setBatchErrors] = useState([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);


  // Alert dialog states
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('info');

  // Batch result modal states
  const [showBatchResultModal, setShowBatchResultModal] = useState(false);
  const [batchResultTitle, setBatchResultTitle] = useState('');
  const [batchResultMessage, setBatchResultMessage] = useState('');
  const [batchResultType, setBatchResultType] = useState('success'); // 'success' or 'error' // 'info', 'warning', 'error'

  // Logout confirmation modal state
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Harvest progress modal state
  const [showHarvestProgressModal, setShowHarvestProgressModal] = useState(false);

  // Check for existing auth token on component mount
  useEffect(() => {
    checkAuthToken();
  }, []);

  // Fetch API data when auth token is available
  useEffect(() => {
    if (authToken) {
      fetchAllData();
    }
  }, [authToken]);

  // Auto-calculate hanger weight when number of hangers changes
  useEffect(() => {
    if (tagDetails && tagDetails.numberOfHangers && tagDetails.individualHangerWeight) {
      const numberOfHangers = parseFloat(tagDetails.numberOfHangers);
      const individualWeight = parseFloat(tagDetails.individualHangerWeight);

      // Only calculate if both values are valid numbers
      if (!isNaN(numberOfHangers) && !isNaN(individualWeight) && numberOfHangers > 0 && individualWeight > 0) {
        const totalWeight = numberOfHangers * individualWeight;

        // Update the hanger weight field with the calculated total
        setTagDetails(prev => ({
          ...prev,
          hangerWeight: totalWeight.toFixed(2) // Round to 2 decimal places
        }));
      }
    } else if (tagDetails && (!tagDetails.hangerType || tagDetails.hangerType === '')) {
      // If no hanger type is provided, set hanger weight to 0
      setTagDetails(prev => ({
        ...prev,
        hangerWeight: '0.00'
      }));
    } else if (tagDetails && tagDetails.hangerWeight && (!tagDetails.numberOfHangers || parseFloat(tagDetails.numberOfHangers) <= 0)) {
      // Clear hanger weight if number of hangers is invalid
      setTagDetails(prev => ({
        ...prev,
        hangerWeight: ''
      }));
    }
  }, [tagDetails?.numberOfHangers, tagDetails?.individualHangerWeight, tagDetails?.hangerType]);

  // Auto-calculate net weight when gross weight, hanger weight, or cart weight changes
  useEffect(() => {
    if (tagDetails) {
      const grossWeight = parseFloat(tagDetails.grossWeight) || 0;
      const hangerWeight = parseFloat(tagDetails.hangerWeight) || 0;
      const cartWeight = parseFloat(tagDetails.cartWeight) || 0;

      // If gross weight is empty or 0, clear net weight
      if (!tagDetails.grossWeight || grossWeight <= 0) {
        if (tagDetails.netWeight && tagDetails.netWeight !== '') {
          setTagDetails(prev => ({
            ...prev,
            netWeight: ''
          }));
        }
        return;
      }

      // Calculate net weight: Gross Weight - Hanger Weight - Cart Weight
      const netWeight = grossWeight - hangerWeight - cartWeight;

      // Only update if the calculated value is different from current value
      if (tagDetails.netWeight !== netWeight.toFixed(2)) {
        setTagDetails(prev => ({
          ...prev,
          netWeight: netWeight >= 0 ? netWeight.toFixed(2) : '0.00' // Don't show negative weights
        }));
      }
    }
  }, [tagDetails?.grossWeight, tagDetails?.hangerWeight, tagDetails?.cartWeight]);

  // Set initial focus on location when component loads
  useEffect(() => {
    if (!tagDetails) {
      // Multiple attempts to focus with increasing delays
      const attemptFocus = (attempt = 1) => {
        if (locationRef.current) {
          locationRef.current.focus();
        } else if (attempt < 5) {
          setTimeout(() => attemptFocus(attempt + 1), 200 * attempt);
        }
      };

      setTimeout(() => attemptFocus(), 500);
    }
  }, []);

  // Cleanup timeouts on component unmount
  useEffect(() => {
    return () => {
      if (cartSubmitTimeoutRef.current) {
        clearTimeout(cartSubmitTimeoutRef.current);
      }
      if (hangerSubmitTimeoutRef.current) {
        clearTimeout(hangerSubmitTimeoutRef.current);
      }
      if (harvestSubmitTimeoutRef.current) {
        clearTimeout(harvestSubmitTimeoutRef.current);
      }
    };
  }, []);

  // Focus management after form is loaded
  useEffect(() => {
    if (tagDetails && tagDetails.item) {
      // Focus on cart first after a short delay
      setTimeout(() => {
        if (cartRef.current) {
          cartRef.current.focus();
        }
      }, 500);
    }
  }, [tagDetails?.item]);

  const checkAuthToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUsername = await AsyncStorage.getItem('username');
      if (storedToken) {
        setAuthToken(storedToken);
        setUsername(storedUsername || '');
        // User is already authenticated, stay on Home screen
      } else {
        // No auth token found, redirect to login
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('Error checking auth token:', error);
      navigation.replace('Login');
    }
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      // Fetch cart master and hanger APIs
      const [cartMasterResponse, hangerResponse] = await Promise.all([
        fetch(API_URLS.CART_MASTER, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${authToken}`,
          }
        }),
        fetch(API_URLS.HANGER, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${authToken}`,
          }
        })
      ]);

      // Process responses
      const cartMasterData = cartMasterResponse.ok ? await cartMasterResponse.json() : [];
      const hangerData = hangerResponse.ok ? await hangerResponse.json() : [];

      // Store cart master and hanger data in apiData
      setApiData(prevData => {
        const newData = {
          ...prevData,
          cartMaster: cartMasterData.value || [],
          hanger: hangerData.value || [],
          // Initialize other fields as empty arrays/objects
          binLocations: [],
          items: [],
          immaturePlanner2: [],
          immaturePlanner: null
        };

        // console.log('Initial apiData structure (cart master & hanger):', newData);
        return newData;
      });

      // Initialize filtered arrays
      setFilteredLocations([]); // Will be populated when harvest data is loaded

    } catch (error) {
      console.error('Error fetching data:', error);
      showAlertDialogMessage('Error', 'Failed to fetch data from server', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMetrcTagEnter = async (harvestName) => {
    if (!harvestName.trim()) {
      showAlertDialogMessage('Input Required', 'Please enter a harvest name', 'warning');
      return;
    }

    if (!locationInput.trim()) {
      showAlertDialogMessage('Input Required', 'Please enter a location', 'warning');
      return;
    }

    // Show loading popup and disable both location and harvest name fields immediately
    setShowHarvestNameLoadingModal(true);
    setIsLoadingHarvestDetails(true);

    try {
      // Single API call: Check for records with harvest name (MnfSerial) and location
      const response = await fetch(`${API_URLS.IMMATURE_PLANNER}?$filter=Quantity ne 0 and U_Phase eq 'Flower' and endswith(ItemName,'Cannabis Plant') and MnfSerial eq '${harvestName}' and BinLocationCode eq '${locationInput}'`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authToken}`,
        }
      });

      if (!response.ok) {
        showAlertDialogMessage('Error', 'Failed to check harvest name', 'error');
        return;
      }

      const data = await response.json();

      if (!data.value || data.value.length === 0) {
        // Clear both location and harvest name fields when no records found
        // setLocationInput('');
        setMetrcTag('');
        showAlertDialogMessage('No Records Found', 'No records found for this harvest name and location combination. Please verify the harvest name and location and try again.', 'warning');
        return;
      }

      // Get the first record's data
      const mnfSerial = data.value[0].MnfSerial;
      const binLocationCode = data.value[0].BinLocationCode;
      const metricLicense = data.value[0].U_MetrcLicense;

      if (!mnfSerial) {
        showAlertDialogMessage('Data Error', 'No MnfSerial found in the record. Please contact support.', 'error');
        return;
      }

      if (!metricLicense) {
        showAlertDialogMessage('Missing Data', 'Missing required fields in the record. Please contact support.', 'error');
        return;
      }

      const ItemNameValue = data.value[0].StrainName + " - " + "Wet Cannabis";

      const binLocationsResponse = await fetch(`${API_URLS.BIN_LOCATIONS}?$filter=U_MetrcLicense eq '${metricLicense}'&$orderby=BinCode asc,U_MetrcLicense asc`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authToken}`,
        }
      });

      // Filter Items by ItemName
      const itemsResponse = await fetch(`${API_URLS.ITEMS}?$filter=ItemName eq '${ItemNameValue}'&$select=ItemName,ItemCode`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authToken}`,
        }
      });

      // Process responses
      const binLocationsData = binLocationsResponse.ok ? await binLocationsResponse.json() : [];
      const itemsData = itemsResponse.ok ? await itemsResponse.json() : [];

      // Store the filtered values in apiData
      setApiData(prevData => {
        const newData = {
          ...prevData,
          binLocations: binLocationsData.value || [],
          items: itemsData.value || [],
          immaturePlanner2: data.value || [],
          immaturePlanner: data.value[0]
        };

        return newData;
      });

      // Initialize filtered arrays for dropdowns
      setFilteredLocations(binLocationsData.value || []);

      // Get the initial location from response
      const initialLocation = data.value && data.value.length > 0
        ? data.value[0].BinLocationCode
        : '';

      // Initialize form fields with the entered harvest name and fetched data
      setTagDetails({
        tag: mnfSerial,
        item: itemsData.value && itemsData.value.length > 0 ? itemsData.value[0].ItemName : '',
        availablePlants: data.value ? data.value.length.toString() : '0',
        numberOfPlants: '',
        harvestName: harvestName, // Set harvest name as default
        cart: '',
        cartWeight: '',
        hangerType: '',
        numberOfHangers: '18', // Set default to 18, user can change
        individualHangerWeight: '',
        hangerWeight: '0.00', // Set default to 0.00
        grossWeight: '',
        netWeight: '',
        location: initialLocation || metricLicense || ''
      });

      // Initialize input text values
      setCartInputText('');
      setHangerInputText('');
      setMetrcTag(harvestName);

      // Harvest name validated and data loaded successfully

    } catch (error) {
      console.error('Error processing harvest name:', error);
      showAlertDialogMessage('Processing Error', 'Failed to process harvest name. Please try again.', 'error');
    } finally {
      setIsLoadingHarvestDetails(false);
      setShowHarvestNameLoadingModal(false);
    }
  };

  const handleLogout = async () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      // Clear all stored authentication data
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('username');

      // Reset local state
      setAuthToken(null);
      setTagDetails(null);
      setMetrcTag('');
      setLocationInput('');
      setCartInputText('');
      setHangerInputText('');
      setLocationSearchText('');
      setShowLocationDropdown(false);
      setApiData({
        items: [],
        cartMaster: [],
        hanger: [],
        binLocations: []
      });

      // Navigate to login
      navigation.replace('Login');
    } catch (error) {
      console.error('Error during logout:', error);
      // Force navigation even if storage clear fails
      navigation.replace('Login');
    }
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const updateField = (field, value) => {
    setTagDetails(prev => ({ ...prev, [field]: value }));
  };

  // Validate number of plants input
  const validateNumberOfPlants = (text) => {
    const numberOfPlants = parseFloat(text) || 0;
    const availablePlants = parseFloat(tagDetails?.availablePlants) || 0;

    // Allow empty string for clearing
    if (text === '') {
      updateField('numberOfPlants', text);
      return;
    }

    // Check if it's a valid number
    if (isNaN(numberOfPlants) || numberOfPlants < 0) {
      return; // Don't update if invalid
    }

    // Check if it exceeds available plants
    if (numberOfPlants > availablePlants) {
      // Still allow the input but it will show as error
      updateField('numberOfPlants', text);
      return;
    }

    // Valid input
    updateField('numberOfPlants', text);
  };

  // Handle number of plants submission to focus on gross weight
  const handleNumberOfPlantsSubmit = () => {
    if (grossWeightRef.current) {
      grossWeightRef.current.focus();
      // Scroll to the gross weight input field
      scrollToInput(grossWeightRef);
    }
  };

  // Handle gross weight submission to scroll to bottom
  const handleGrossWeightSubmit = () => {
    // First blur the current input
    if (grossWeightRef.current) {
      grossWeightRef.current.blur();
    }
    
    // Dismiss keyboard completely
    Keyboard.dismiss();
    
    // Force blur all other inputs immediately
    if (locationRef.current) locationRef.current.blur();
    if (metrcTagInputRef.current) metrcTagInputRef.current.blur();
    if (cartRef.current) cartRef.current.blur();
    if (hangerRef.current) hangerRef.current.blur();
    if (numberOfHangersRef.current) numberOfHangersRef.current.blur();
    if (numberOfPlantsRef.current) numberOfPlantsRef.current.blur();
    if (harvestNameDetailsRef.current) harvestNameDetailsRef.current.blur();
    
    // Additional blur after a short delay to ensure it sticks
    setTimeout(() => {
      if (locationRef.current) locationRef.current.blur();
      if (metrcTagInputRef.current) metrcTagInputRef.current.blur();
      if (cartRef.current) cartRef.current.blur();
      if (hangerRef.current) hangerRef.current.blur();
      if (numberOfHangersRef.current) numberOfHangersRef.current.blur();
      if (numberOfPlantsRef.current) numberOfPlantsRef.current.blur();
      if (harvestNameDetailsRef.current) harvestNameDetailsRef.current.blur();
      if (grossWeightRef.current) grossWeightRef.current.blur();
    }, 100);
    
    // Scroll to bottom after a short delay
    setTimeout(() => {
      // Scroll to the end of the form
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }
    }, 200);
  };

  // Validate gross weight input to accept only numbers with decimals (max 2 decimal places)
  const validateGrossWeight = (text) => {
    // Remove all non-numeric characters except decimal point
    let cleanedText = text.replace(/[^0-9.]/g, '');

    // Handle multiple decimal points - keep only the first one
    const decimalIndex = cleanedText.indexOf('.');
    if (decimalIndex !== -1) {
      const beforeDecimal = cleanedText.substring(0, decimalIndex);
      const afterDecimal = cleanedText.substring(decimalIndex + 1).replace(/\./g, '');
      // Limit to 2 decimal places
      const limitedAfterDecimal = afterDecimal.substring(0, 2);
      cleanedText = beforeDecimal + '.' + limitedAfterDecimal;
    }

    // Handle leading zeros (e.g., "00.5" becomes "0.5")
    if (cleanedText.length > 1 && cleanedText[0] === '0' && cleanedText[1] !== '.') {
      cleanedText = cleanedText.replace(/^0+/, '0');
    }

    // Handle case where user enters just a decimal point
    if (cleanedText === '.') {
      cleanedText = '0.';
    }

    // Handle case where user enters multiple leading zeros followed by decimal
    if (cleanedText.match(/^0+\./)) {
      cleanedText = '0' + cleanedText.substring(cleanedText.indexOf('.'));
    }

    // Update the field with cleaned value
    updateField('grossWeight', cleanedText);
  };

  // Handle cart input text change (just update the text, no validation)
  const handleCartInputChange = (text) => {
    setCartInputText(text);
    currentCartInputRef.current = text; // Store current value for scanner handling

    // Clear any existing timeout when text changes (scanner is still inputting)
    if (cartSubmitTimeoutRef.current) {
      clearTimeout(cartSubmitTimeoutRef.current);
    }
  };

  // Validate cart input when user presses Enter
  const validateCartInput = () => {
    const text = currentCartInputRef.current.trim();

    if (!text) {
      // Clear cart data if input is empty
      setTagDetails(prev => ({
        ...prev,
        cart: '',
        cartWeight: ''
      }));
      return;
    }

    // Find matching cart in the data
    const matchingCart = apiData.cartMaster.find(cart =>
      cart.Name && cart.Name.toLowerCase() === text.toLowerCase()
    );

    if (matchingCart) {
      // Valid cart found
      // console.log('Matching cart found:', matchingCart);
      const weight = getPropertyValue(matchingCart, ['U_Weight', 'u_weight', 'weight', 'Weight', 'U_WEIGHT']);
      // console.log('Extracted cart weight:', weight);

      setTagDetails(prev => ({
        ...prev,
        cart: matchingCart.Name,
        cartWeight: weight ? weight.toString() : ''
      }));

      // Focus on hanger after successful cart validation and scroll to it
      setTimeout(() => {
        if (hangerRef.current) {
          hangerRef.current.focus();
          // Scroll to the hanger input field
          scrollToInput(hangerRef);
        }
      }, 100);
    } else {
      // Invalid cart - show popup but don't move focus
      showAlertDialogMessage('Invalid Cart', `Cart "${text}" not found. Please enter a valid cart name.`, 'warning');

      // Clear cart data
      setTagDetails(prev => ({
        ...prev,
        cart: '',
        cartWeight: ''
      }));

      // Keep focus on cart input so user can correct it
      setTimeout(() => {
        if (cartRef.current) {
          cartRef.current.focus();
        }
      }, 100);
    }
  };

  // Handle hanger input text change (just update the text, no validation)
  const handleHangerInputChange = (text) => {
    // console.log('Hanger input changed:', text);
    setHangerInputText(text);
    currentHangerInputRef.current = text; // Store current value for scanner handling

    // Clear any existing timeout when text changes (scanner is still inputting)
    if (hangerSubmitTimeoutRef.current) {
      // console.log('Clearing existing hanger timeout');
      clearTimeout(hangerSubmitTimeoutRef.current);
    }
  };

  // Validate hanger input when user presses Enter
  const validateHangerInput = () => {
    const text = currentHangerInputRef.current.trim();
    // console.log('Validating hanger input:', text);
    // console.log('Available hangers:', apiData.hanger?.map(h => h.Name));

    if (!text) {
      // console.log('Empty hanger input, showing validation error');
      // Show validation error for empty hanger input
      showAlertDialogMessage('Required Field', 'Please enter a hanger type', 'warning');
      
      // Clear hanger data
      setTagDetails(prev => ({
        ...prev,
        hangerType: '',
        individualHangerWeight: '',
        hangerWeight: '',
        numberOfHangers: prev.numberOfHangers || '18' // Keep existing value or default to 18
      }));
      
      // Keep focus on hanger input so user can correct it
      setTimeout(() => {
        if (hangerRef.current) {
          hangerRef.current.focus();
        }
      }, 100);
      return;
    }

    // Find matching hanger in the data
    const matchingHanger = apiData.hanger.find(hanger =>
      hanger.Name && hanger.Name.toLowerCase() === text.toLowerCase()
    );

    // console.log('Matching hanger found:', matchingHanger);

    if (matchingHanger) {
      // Valid hanger found
      const weight = getPropertyValue(matchingHanger, ['U_Weight', 'u_weight', 'weight', 'Weight', 'U_WEIGHT']);
      // console.log('Hanger weight found:', weight);

      setTagDetails(prev => ({
        ...prev,
        hangerType: matchingHanger.Name,
        individualHangerWeight: weight ? weight.toString() : '',
        hangerWeight: prev.hangerType === matchingHanger.Name ? prev.hangerWeight : '', // Only clear if hanger type changed
        numberOfHangers: prev.numberOfHangers || '18' // Keep existing value or default to 18
      }));

      // console.log('Hanger validation successful, focusing on number of plants');
      // Focus on number of plants after successful hanger validation and scroll to it
      setTimeout(() => {
        if (numberOfPlantsRef.current) {
          numberOfPlantsRef.current.focus();
          // Scroll to the number of plants input field
          scrollToInput(numberOfPlantsRef);
        }
      }, 100);
    } else {
      // Invalid hanger - show popup but don't move focus
      // console.log('Invalid hanger, showing alert');
      showAlertDialogMessage('Invalid Hanger', `Hanger "${text}" not found. Please enter a valid hanger name.`, 'warning');

      // Clear hanger data
      setTagDetails(prev => ({
        ...prev,
        hangerType: '',
        individualHangerWeight: '',
        hangerWeight: ''
      }));

      // Keep focus on hanger input so user can correct it
      setTimeout(() => {
        if (hangerRef.current) {
          hangerRef.current.focus();
        }
      }, 100);
    }
  };

  // Helper function to safely access nested properties
  const getPropertyValue = (obj, possibleNames) => {
    if (!obj) return null;

    for (const name of possibleNames) {
      if (obj[name] !== undefined && obj[name] !== null) {
        return obj[name];
      }
    }
    return null;
  };

  // Helper function to scroll to a specific input field
  const scrollToInput = (inputRef, delay = 100) => {
    setTimeout(() => {
      if (inputRef.current && scrollViewRef.current) {
        // For KeyboardAwareScrollView, use scrollToFocusedInput method
        if (scrollViewRef.current.scrollToFocusedInput) {
          scrollViewRef.current.scrollToFocusedInput(inputRef.current, 100);
        }
        // Fallback to scrollToEnd if scrollToFocusedInput is not available
        else if (scrollViewRef.current.scrollToEnd) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }
    }, delay);
  };


  // Helper function to handle delayed submission for scanner inputs
  const handleDelayedSubmit = (timeoutRef, submitFunction, delay = APP_CONFIG.SCANNER_DELAY) => {
    // console.log('handleDelayedSubmit called with delay:', delay);
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      // console.log('Clearing existing timeout');
      clearTimeout(timeoutRef.current);
    }

    // Set a new timeout to allow scanner input to complete
    timeoutRef.current = setTimeout(() => {
      // console.log('Timeout completed, calling submit function');
      submitFunction();
    }, delay);
  };

  // Location dropdown functions
  const handleLocationSearch = (text) => {
    setLocationSearchText(text);
    if (text.trim() === '') {
      setFilteredLocations(apiData.binLocations);
    } else {
      const filtered = apiData.binLocations.filter(location =>
        location.BinCode && location.BinCode.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredLocations(filtered);
    }
  };

  const selectLocation = (location) => {
    setTagDetails(prev => ({
      ...prev,
      location: location.BinCode || ''
    }));
    setLocationSearchText(location.BinCode || '');
    setShowLocationDropdown(false);
  };

  const openLocationDropdown = () => {
    setFilteredLocations(apiData.binLocations);
    setShowLocationDropdown(true);
  };

  const handleSubmit = async () => {
    if (tagDetails && authToken) {
      // Validate number of plants
      const numberOfPlants = parseFloat(tagDetails.numberOfPlants) || 0;
      const availablePlants = parseFloat(tagDetails.availablePlants) || 0;

      if (numberOfPlants > availablePlants) {
        showAlertDialogMessage('Validation Error', `Number of plants (${numberOfPlants}) cannot exceed available plants (${availablePlants})`, 'warning');
        return;
      }

      if (numberOfPlants <= 0) {
        showAlertDialogMessage('Validation Error', 'Number of plants must be greater than 0', 'warning');
        return;
      }

      // Validate all required fields (same as SAP UI5 validation)
      if (tagDetails.numberOfPlants === "") {
        showAlertDialogMessage('Required Field', 'Please enter No. of Plants', 'warning');
        return;
      } else if (tagDetails.harvestName === "") {
        showAlertDialogMessage('Required Field', 'Please enter Harvest Name', 'warning');
        return;
      } else if (tagDetails.cart === "") {
        showAlertDialogMessage('Required Field', 'Please Select Cart', 'warning');
        return;
      } else if (tagDetails.hangerType === "") {
        showAlertDialogMessage('Required Field', 'Please Select Hanger Type', 'warning');
        return;
      } else if (tagDetails.hangerType && tagDetails.hangerType !== "" && tagDetails.hangerWeight === "") {
        showAlertDialogMessage('Required Field', 'Please Select Hanger Weight', 'warning');
        return;
      } else if (tagDetails.numberOfHangers === "" || parseFloat(tagDetails.numberOfHangers) <= 0) {
        showAlertDialogMessage('Required Field', 'Please enter Number of Hangers greater than 0', 'warning');
        return;
      } else if (tagDetails.grossWeight === "" || parseFloat(tagDetails.grossWeight) <= 0) {
        showAlertDialogMessage('Required Field', 'Please enter gross weight greater than 0', 'warning');
        return;
      } else if (tagDetails.location === "") {
        showAlertDialogMessage('Required Field', 'Please Select Drying Location', 'warning');
        return;
      } else if (parseFloat(tagDetails.netWeight) <= 0) {
        showAlertDialogMessage('Required Field', 'Net weight must be greater than 0', 'warning');
        return;
      }

      setIsSubmitting(true);
      setShowHarvestProgressModal(true); // Show harvest progress popup

      // Find the selected location from binLocations
      // console.log("Looking for location with BinCode:", tagDetails.location);
      // console.log("Available binLocations:", apiData.binLocations);

      const selectedLocation = apiData.binLocations.find(location => {
        console.log("Checking location:", location.BinCode, "against:", tagDetails.location, "Match:", location.BinCode === tagDetails.location);
        return location.BinCode === tagDetails.location;
      });

      setSelectedLocationValue(selectedLocation);
      // console.log("selectedLocation", selectedLocation);
      // console.log("tagDetails.location", tagDetails.location);
      // console.log("apiData.binLocations", apiData.binLocations);

      // Validate that we found a matching location
      if (!selectedLocation) {
        Alert.alert('Error', `No matching location found for: ${tagDetails.location}. Please check the location selection.`);
        setIsSubmitting(false);
        setShowHarvestProgressModal(false); // Hide harvest progress popup
        return;
      }



      try {
        // Log all the details being submitted
        console.log('Submitting harvest details:', tagDetails);

        // Get current date in UTC format
        const currentDate = new Date().toISOString();

        // First API call: Check if harvest record exists (NPFET)
        const checkHarvestResponse = await fetch(`${API_URLS.NPFET}?$filter=U_NLFID eq '${apiData.binLocations && apiData.binLocations.length > 0 ? apiData.binLocations[0].U_MetrcLicense : tagDetails.location}' and U_NHBID eq '${tagDetails.harvestName}' and U_IsHarvested eq 'Yes'`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${authToken}`,
          }
        });

        if (!checkHarvestResponse.ok) {
          throw new Error(`First API call failed: ${checkHarvestResponse.status}`);
        }

        const checkHarvestData = await checkHarvestResponse.json();
        console.log('First API response (NPFET):', checkHarvestData);

        // Check if first API response is empty
        if (!checkHarvestData.value || checkHarvestData.value.length === 0) {
          console.log('First API response is empty, creating harvest record...');

          // Create harvest payload based on SAP UI5 structure
          const harvestPayload = {
            U_NHOWT: parseFloat(tagDetails.netWeight).toFixed(2), // total weight
            U_NWFWT: parseFloat(tagDetails.netWeight).toFixed(2), // wet weight
            U_NLOCD: selectedLocation ? (selectedLocation.Warehouse || selectedLocation.warehouse || selectedLocation.WarehouseCode || selectedLocation.warehouseCode || tagDetails.location) : tagDetails.location, // location
            U_NLCNM: selectedLocation ? (selectedLocation.AbsEntry || selectedLocation.absEntry || selectedLocation.AbsEntryCode || selectedLocation.absEntryCode || selectedLocation.Code || selectedLocation.code || tagDetails.location) : tagDetails.location, // location name
            U_NSTNM: tagDetails.item.split(" - ")[0], // strain name
            U_NPQTY: Number(tagDetails.numberOfPlants), // number of plants
            U_NHBID: tagDetails.harvestName, // harvest name
            U_WHSCODE: tagDetails.location, // warehouse code
            U_NHEDT: currentDate, // harvest date
            U_NWSRP: "0", // default value
            U_NBTST: "H", // default value
            U_NLFID: apiData.binLocations && apiData.binLocations.length > 0 ? apiData.binLocations[0].U_MetrcLicense : tagDetails.location, // license ID
            U_NITCD: apiData.items && apiData.items.length > 0 ? apiData.items[0].ItemCode : tagDetails.item, // item code
            U_NITEM: tagDetails.item, // item name
            U_NGRHWT: Number(tagDetails.grossWeight).toFixed(2), // gross weight
            U_NCTTP: tagDetails.cart, // cart type
            U_NCTWT: Number(tagDetails.cartWeight).toFixed(2), // cart weight
            U_NHNTP: tagDetails.hangerType || '', // hanger type (empty if not provided)
            U_NHNWT: Number(tagDetails.hangerWeight || 0).toFixed(2), // hanger weight (0 if not provided)
            U_NNOHN: Number(tagDetails.numberOfHangers || 0) // number of hangers (18 if not provided)
          };

          // console.log('Harvest payload:', harvestPayload);
          // console.log('Location details - Warehouse:', selectedLocation?.Warehouse, 'AbsEntry:', selectedLocation?.AbsEntry);
          // console.log('All selectedLocation properties:', selectedLocation ? Object.keys(selectedLocation) : 'No location selected');
          // console.log('Full selectedLocation object:', selectedLocation);

          // Create batchUrl array and push NPFETLINES
          const batchUrl = [];
          const batchCallLines = [];
          batchCallLines.push(JSON.parse(JSON.stringify(harvestPayload))); // structuredClone equivalent

          // Push NPFETLINES to batchUrl
          batchUrl.push({
            entity: "/b1s/v1/NPFETLINES",
            data: batchCallLines[0],
            method: "POST"
          });

          // Second API call: POST to NPFET with harvest payload
          const checkNPFETAgainResponse = await fetch(`${API_URLS.NPFET}?$filter=U_NLFID eq '${apiData.binLocations[0].U_MetrcLicense}' and U_NHBID eq '${tagDetails.harvestName}'&$orderby=DocNum desc`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${authToken}`,
            }
          });

          console.log('Harvest API response status:', checkNPFETAgainResponse.status);


          if (!checkNPFETAgainResponse.ok) {
            throw new Error(`Second NPFET check failed: ${checkNPFETAgainResponse.status}`);
          }

          const checkNPFETAgainData = await checkNPFETAgainResponse.json();
          console.log('Second NPFET check response:', checkNPFETAgainData);
          // Delete some properties from payload for update
          var harvestPayload2 = JSON.parse(JSON.stringify(harvestPayload));
          delete harvestPayload2.U_NCTTP; // cart type
          delete harvestPayload2.U_NCTWT; // cart weight
          delete harvestPayload2.U_NHNTP; // hanger type
          delete harvestPayload2.U_NHNWT; // hanger weight
          delete harvestPayload2.U_NNOHN; // number of hangers

          if (checkNPFETAgainData.value && checkNPFETAgainData.value.length > 0) {

            const existingRecord = checkNPFETAgainData.value[0];

            // Check if existing record is in same location
            if (existingRecord.U_WHSCODE === tagDetails.location) {
              console.log('Updating existing record in same location...');

              console.log('Existing record:', existingRecord);
              console.log('Harvest payload2:', harvestPayload2);

              // Update quantities
              harvestPayload2.U_NPQTY = Number(harvestPayload2.U_NPQTY) + Number(existingRecord.U_NPQTY || 0);
              harvestPayload2.U_NGRHWT = Number(harvestPayload2.U_NGRHWT) + Number(existingRecord.U_NGRHWT || 0);
              harvestPayload2.U_NWFWT = Number(harvestPayload2.U_NWFWT) + Number(existingRecord.U_NWFWT || 0);
              harvestPayload2.U_NHOWT = Number(harvestPayload2.U_NHOWT) + Number(existingRecord.U_NHOWT || 0);

              console.log('Updated harvest payload2:', harvestPayload2);
              // Update existing record
              const updateResponse = await fetch(`${API_URLS.NPFET}(${existingRecord.DocNum})`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Basic ${authToken}`,
                },
                body: JSON.stringify(harvestPayload2)
              });

              console.log('Update API response status:', updateResponse.status);

              // Parse response for logging
              let logResponse;
              if (updateResponse.ok) {
                try {
                  // const responseData = await updateResponse.json();
                  logResponse = "";
                } catch (parseError) {
                  logResponse = "Success (parse error)";
                }
              } else {
                try {
                  const errorText = await updateResponse.text();
                  logResponse = errorText.includes("message") ? errorText.split("message")[2] || "Unknown error" : "Update failed";
                } catch (parseError) {
                  logResponse = "Update failed (parse error)";
                }
              }

              const logData = {
                U_NDTTM: currentDate,
                U_NUSID: username,
                U_NLGMT: "PATCH",
                U_NLURL: `b1s/v1/NPFET(${existingRecord.DocNum})`,
                U_NLGBD: JSON.stringify(harvestPayload2),
                U_NLGRP: logResponse,
                U_NLGST: updateResponse.ok ? 200 : 400,
                U_NAPP: APP_CONFIG.NAME
              };
              captureLog(logData);

              // Check if update operation was successful - only proceed with batch if successful
              if (!updateResponse.ok) {
                displayErrorMessage('Update Failed', 'Failed to update harvest record. Please try again.');
                console.error('Update NPFET failed:', updateResponse);
                setIsSubmitting(false);
                setShowHarvestProgressModal(false); // Hide harvest progress popup
                return;
              }

              console.log('Update NPFET successful, proceeding with batch operations...');

              apiData.immaturePlanner2.forEach((plant, sIndex) => {
                if (sIndex < numberOfPlants) {
                  const payLoadInventoryEntry = {
                    U_Phase: "Harvest",
                    BatchAttribute1: tagDetails.harvestName
                  };
                  batchUrl.push({
                    entity: `/b1s/v1/BatchNumberDetails(${plant.BatchAbsEntry})`,
                    data: payLoadInventoryEntry,
                    method: "PATCH"
                  });
                }
              });




              function captureLog(logData) {
                fetch(API_URLS.NBNLG, {
                  method: 'POST',
                  headers: { 'Authorization': `Basic ${authToken}` },
                  body: JSON.stringify(logData)
                })
                  .then(response => response.json())
                  .then(data => console.log('Log response:', data))
                  .catch(console.error);
              }

              async function callBatchService(batchUrl, callBack) {
                var reqHeader = `--clone_batch--\r\nContent-Type:application/http  \r\nContent-Transfer-Encoding:binary\r\n \r\n`;
                var payLoad = reqHeader;

                batchUrl.forEach((sObj, i) => {
                  payLoad = payLoad + sObj.method + " " + sObj.entity + `\r\n \r\n`;
                  payLoad = payLoad + JSON.stringify(sObj.data) + `\r\n \r\n`;
                  if (batchUrl.length - 1 === i) {
                    payLoad = payLoad + "--clone_batch--";
                  } else {
                    payLoad = payLoad + reqHeader;
                  }
                });

                try {
                  const response = await fetch(API_URLS.BATCH_SERVICE, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'multipart/mixed;boundary=clone_batch',
                      'Authorization': `Basic ${authToken}`,
                    },
                    body: payLoad
                  });
                  const text = await response.text();

                  const logData = {
                    U_NDTTM: currentDate,
                    U_NUSID: username,
                    U_NLGMT: "POST",
                    U_NLURL: "Batch calls",
                    U_NLGBD: payLoad,
                    U_NLGRP: text.includes("error") ? text.split("message")[2] || "Unknown error" : "",
                    U_NLGST: response.ok ? 200 : 400,
                    U_NAPP: APP_CONFIG.NAME
                  };
                  captureLog(logData);

                  if (text.includes("error")) {
                    // Extract error message more reliably
                    let errorMessage = "Batch operation failed";
                    try {
                      if (text.includes("message")) {
                        const messageMatch = text.match(/message["\s]*:["\s]*([^"]+)/i);
                        errorMessage = messageMatch ? messageMatch[1] : "Batch operation failed";
                      }
                    } catch (parseError) {
                      errorMessage = "Failed to parse error message";
                    }
                    callBack({ success: false, error: errorMessage, batchSize: batchUrl.length });
                  } else {
                    callBack({ success: true, batchSize: batchUrl.length });
                  }
                } catch (err) {
                  callBack({ success: false, error: err.message, batchSize: batchUrl.length });
                }
              }

              async function createBatchCall(batchUrl, callBack) {
                if (!batchUrl || batchUrl.length === 0) {
                  callBack({ success: true, totalProcessed: 0 });
                  return;
                }

                const batchSize = APP_CONFIG.BATCH_SIZE;
                const totalBatches = Math.ceil(batchUrl.length / batchSize);
                let processedCount = 0;
                let allErrors = [];
                let successCount = 0;

                try {
                  // Process batches
                  for (let i = 0; i < totalBatches; i++) {
                    const startIndex = i * batchSize;
                    const endIndex = Math.min(startIndex + batchSize, batchUrl.length);
                    const currentBatch = batchUrl.slice(startIndex, endIndex);

                    await new Promise((resolve) => {
                      callBatchService(currentBatch, (result) => {
                        if (result.success) {
                          successCount++;
                        } else {
                          allErrors.push(result.error);
                        }
                        processedCount += result.batchSize;
                        resolve();
                      });
                    });
                  }

                  // Final callback with results
                  callBack({
                    success: allErrors.length === 0,
                    totalProcessed: processedCount,
                    successCount: successCount,
                    errorCount: allErrors.length,
                    errors: allErrors
                  });
                } catch (error) {
                  callBack({
                    success: false,
                    totalProcessed: processedCount,
                    error: error.message,
                    errors: allErrors
                  });
                }
              }

              // Call batch API with proper error handling
              console.log('Calling batch API with URLs:', batchUrl);
              setIsBatchProcessing(true);
              setBatchErrors([]);

              const batchResult = await createBatchCall(batchUrl, (result) => {
                console.log('Batch processing completed:', result);

                if (result.success) {
                  displaySuccessMessage(`Successfully harvested ${tagDetails.numberOfPlants} plants for harvest name ${tagDetails.harvestName}.`);
                  clearHarvestData(); // Clear form data after successful submission
                } else {
                  const errorMessage = result.errors && result.errors.length > 0
                    ? `Batch processing completed with ${result.errorCount} errors:\n\n${result.errors.join('\n')}`
                    : `Batch processing failed: ${result.error || 'Unknown error'}`;

                  displayErrorMessage('Batch Processing Errors', errorMessage);
                  setBatchErrors(result.errors || [result.error]);
                }
              });

              setIsBatchProcessing(false);
              setIsSubmitting(false);
              setShowHarvestProgressModal(false); // Hide harvest progress popup

              console.log('Batch processing completed');

            } else {
              displayErrorMessage('Location Mismatch', `Harvest batch already created in different location: ${existingRecord.U_WHSCODE}`);
              setShowHarvestProgressModal(false); // Hide harvest progress popup
              return;
            }
          } else {
            console.log('No existing record found, creating new one...');
            console.log('Harvest payload2:', harvestPayload2);

            // POST to NPFET
            const createResponse = await fetch(API_URLS.NPFET, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${authToken}`,
              },
              body: JSON.stringify(harvestPayload2)
            });



            console.log('Create NPFET response status:', createResponse.status);

            // Log the create operation
            let createLogResponse;
            if (createResponse.ok) {
              try {
                const responseData = await createResponse.json();
                createLogResponse = responseData.DocNum || "Success";
              } catch (parseError) {
                createLogResponse = "Success (parse error)";
              }
            } else {
              try {
                const errorText = await createResponse.text();
                createLogResponse = errorText.includes("message") ? errorText.split("message")[2] || "Unknown error" : "Create failed";
              } catch (parseError) {
                createLogResponse = "Create failed (parse error)";
              }
            }

            const createLogData = {
              U_NDTTM: currentDate,
              U_NUSID: username,
              U_NLGMT: "POST",
              U_NLURL: "b1s/v1/NPFET",
              U_NLGBD: JSON.stringify(harvestPayload2),
              U_NLGRP: createLogResponse,
              U_NLGST: createResponse.ok ? 200 : 400,
              U_NAPP: APP_CONFIG.NAME
            };
            captureLog(createLogData);


            // Check if create operation was successful
            if (!createResponse.ok) {
              displayErrorMessage('Create Failed', 'Failed to create harvest record. Please try again.');
              console.error('Create NPFET failed:', createResponse.status);
              setIsSubmitting(false);
              setShowHarvestProgressModal(false); // Hide harvest progress popup
              return;
            }


            apiData.immaturePlanner2.forEach((plant, sIndex) => {
              if (sIndex < numberOfPlants) {
                const payLoadInventoryEntry = {
                  U_Phase: "Harvest",
                  BatchAttribute1: tagDetails.harvestName
                };
                batchUrl.push({
                  entity: `/b1s/v1/BatchNumberDetails(${plant.BatchAbsEntry})`,
                  data: payLoadInventoryEntry,
                  method: "PATCH"
                });
              }
            });



            // Call batch API with proper error handling
            console.log('Calling batch API with URLs:', batchUrl);
            setIsBatchProcessing(true);
            setBatchErrors([]);

            const batchResult = await createBatchCall(batchUrl, (result) => {
              console.log('Batch processing completed:', result);

              if (result.success) {
                displaySuccessMessage(`Successfully harvested ${tagDetails.numberOfPlants} plants for harvest name ${tagDetails.harvestName}.`);
                clearHarvestData(); // Clear form data after successful submission
              } else {
                const errorMessage = result.errors && result.errors.length > 0
                  ? `Batch processing completed with ${result.errorCount} errors:\n\n${result.errors.join('\n')}`
                  : `Batch processing failed: ${result.error || 'Unknown error'}`;

                displayErrorMessage('Batch Processing Errors', errorMessage);
                setBatchErrors(result.errors || [result.error]);
              }
            });

            setIsBatchProcessing(false);
            setIsSubmitting(false);
            setShowHarvestProgressModal(false); // Hide harvest progress popup


          }
        } else {
          console.log('First API response is not empty, harvest batch already exists');
          displayErrorMessage('Harvest Batch Exists', 'The entered Harvest Batch already exists. Please enter a different Harvest Batch.');
          setShowHarvestProgressModal(false); // Hide harvest progress popup
        }

      } catch (error) {
        console.error('Submit error:', error);
        displayErrorMessage('Processing Error', `Failed to process harvest data: ${error.message}`);
      } finally {
        setIsSubmitting(false);
        setShowHarvestProgressModal(false); // Hide harvest progress popup
      }
    }
  };

  const handleCancel = () => {
    // Clear any pending timeouts
    if (cartSubmitTimeoutRef.current) {
      clearTimeout(cartSubmitTimeoutRef.current);
    }
    if (hangerSubmitTimeoutRef.current) {
      clearTimeout(hangerSubmitTimeoutRef.current);
    }
    if (harvestSubmitTimeoutRef.current) {
      clearTimeout(harvestSubmitTimeoutRef.current);
    }

    setMetrcTag('');
    setLocationInput('');
    setTagDetails(null);
    setCartInputText('');
    setHangerInputText('');
    setLocationSearchText('');
    setShowLocationDropdown(false);

    // Reset current input refs
    currentMetrcTagRef.current = '';
    currentCartInputRef.current = '';
    currentHangerInputRef.current = '';

    // Focus the location input after cancel
    setTimeout(() => {
      if (locationRef.current) {
        locationRef.current.focus();
      }
    }, 100);
  };

  // Clear harvest data after successful submission
  const clearHarvestData = () => {
    // Clear any pending timeouts
    if (cartSubmitTimeoutRef.current) {
      clearTimeout(cartSubmitTimeoutRef.current);
    }
    if (hangerSubmitTimeoutRef.current) {
      clearTimeout(hangerSubmitTimeoutRef.current);
    }
    if (harvestSubmitTimeoutRef.current) {
      clearTimeout(harvestSubmitTimeoutRef.current);
    }

    setMetrcTag('');
    setLocationInput('');
    setTagDetails(null);
    setCartInputText('');
    setHangerInputText('');
    setLocationSearchText('');
    setShowLocationDropdown(false);

    // Reset current input refs
    currentMetrcTagRef.current = '';
    currentCartInputRef.current = '';
    currentHangerInputRef.current = '';

    // Focus the location input after successful harvest
    setTimeout(() => {
      if (locationRef.current) {
        locationRef.current.focus();
      }
    }, 100);
  };

  // Show success message modal
  const displaySuccessMessage = (message) => {
    setBatchResultTitle('Success');
    setBatchResultMessage(message);
    setBatchResultType('success');
    setShowBatchResultModal(true);
  };

  // Show error message modal
  const displayErrorMessage = (title, message) => {
    setBatchResultTitle(title);
    setBatchResultMessage(message);
    setBatchResultType('error');
    setShowBatchResultModal(true);
  };

  // Close batch result modal
  const closeBatchResultModal = () => {
    setShowBatchResultModal(false);
  };

  // Alert dialog display function
  const showAlertDialogMessage = (title, message, type = 'info') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setShowAlertDialog(true);
  };

  // Close alert dialog
  const closeAlertDialog = () => {
    setShowAlertDialog(false);

    // Clear input fields if the alert was for invalid cart or hanger
    if (alertTitle === 'Invalid Cart') {
      setCartInputText('');
    } else if (alertTitle === 'Invalid Hanger') {
      setHangerInputText('');
    } else if (alertTitle === 'No Records Found') {
      // Focus back to harvest name field when no records found
      setTimeout(() => {
        if (metrcTagInputRef.current) {
          metrcTagInputRef.current.focus();
        }
      }, 100);
    }
  };

  // If no auth token, don't render the component
  if (!authToken) {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View style={styles.headerRight}>
            {username && (
              <Text style={styles.usernameText}>{username}</Text>
            )}
            <TouchableOpacity 
              style={styles.logoutButton} 
              onPress={handleLogout}
              accessible={false}
              focusable={false}
            >
              <Ionicons name="log-out-outline" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading data...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Logo and Logout */}
      <View style={styles.header}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <View style={styles.headerRight}>
          {username && (
            <Text style={styles.usernameText}>{username}</Text>
          )}
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
            accessible={false}
            focusable={false}
          >
            <Ionicons name="log-out-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAwareScrollView
        ref={scrollViewRef}
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        contentInsetAdjustmentBehavior="automatic"
        extraScrollHeight={170}
        enableOnAndroid={true}
      >




        {/* Batch Processing Status and Errors */}
        {isBatchProcessing && (
          <View style={styles.batchStatusContainer}>
            <Text style={styles.batchStatusText}>Processing batch operations...</Text>
          </View>
        )}

        {batchErrors.length > 0 && (
          <View style={styles.batchErrorContainer}>
            <Text style={styles.batchErrorTitle}>Batch Processing Errors</Text>
            {batchErrors.map((error, index) => (
              <Text key={index} style={styles.batchErrorText}>
                • {error}
              </Text>
            ))}
            <TouchableOpacity
              style={styles.clearErrorsButton}
              onPress={() => setBatchErrors([])}
            >
              <Text style={styles.clearErrorsButtonText}>Clear Errors</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Harvest Name Input Section */}
        <View style={styles.inputSection}>
          <Text style={styles.harvestTitle}>Harvest</Text>

          {/* Location Input - Above Harvest Name */}
          <View style={styles.metrcInputContainer}>
            <View style={styles.metrcLabelContainer}>
              <Text style={styles.metrcLabel}>Location</Text>
            </View>
            <TextInput
              ref={locationRef}
              style={styles.metrcInput}
              placeholder="Scan or enter location"
              value={locationInput}
              onChangeText={setLocationInput}
              returnKeyType="next"
              editable={!tagDetails}
              onSubmitEditing={() => {
                if (metrcTagInputRef.current) {
                  metrcTagInputRef.current.focus();
                }
              }}
            />
          </View>

          <View style={styles.metrcInputContainer}>
            <View style={styles.metrcLabelContainer}>
              <Text style={styles.metrcLabel}>
                {tagDetails ? 'Harvest Name' : 'Harvest Name'}
              </Text>
            </View>
            <TextInput
              ref={metrcTagInputRef}
              style={styles.metrcInput}
              placeholder={tagDetails ? "Harvest ID" : "Scan or enter harvest name"}
              value={tagDetails ? tagDetails.harvestName : metrcTag}
              onChangeText={tagDetails ? undefined : (text) => {
                setMetrcTag(text);
                currentMetrcTagRef.current = text; // Store current value for scanner handling
                // Clear any existing timeout when text changes (scanner is still inputting)
                if (harvestSubmitTimeoutRef.current) {
                  clearTimeout(harvestSubmitTimeoutRef.current);
                }
              }}
              returnKeyType="done"

              editable={!tagDetails && !isLoadingHarvestDetails}

              onSubmitEditing={tagDetails ? undefined : () => handleDelayedSubmit(harvestSubmitTimeoutRef, () => handleMetrcTagEnter(currentMetrcTagRef.current))}
            />
          </View>
        </View>

        {/* Tag Details Section - Show when harvest name is entered */}
        {tagDetails && (
          <View style={styles.detailsSection}>
            <View style={styles.detailsContent}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Item</Text>
                <TextInput
                  style={styles.modernInput}
                  value={tagDetails.item}
                  multiline={true}
                  onChangeText={(text) => updateField('item', text)}
                  placeholder="Enter item"
                  editable={false}
                />
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Available Plants</Text>
                <TextInput
                  style={styles.readOnlyInput}
                  value={tagDetails.availablePlants ? tagDetails.availablePlants.toString() : ''}
                  onChangeText={(text) => updateField('availablePlants', text)}
                  placeholder="Available plants from API"
                  editable={false}
                />
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Cart</Text>
                <TextInput

                  ref={cartRef}
                  style={styles.modernInput}
                  placeholder="Scan or enter cart name"
                  value={cartInputText}
                  onChangeText={handleCartInputChange}
                  returnKeyType="next"
                  onSubmitEditing={() => handleDelayedSubmit(cartSubmitTimeoutRef, validateCartInput)}
                />
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Cart Wgt (lb)</Text>
                <TextInput
                  style={styles.modernInput}
                  value={tagDetails.cartWeight}
                  onChangeText={(text) => updateField('cartWeight', text)}
                  editable={false}
                />
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Hanger Type</Text>
                <TextInput
                ref={hangerRef}
                  style={styles.modernInput}
                  placeholder="Scan or enter hanger type"
                  value={hangerInputText}
                  onChangeText={handleHangerInputChange}
                  returnKeyType="next"
                  onSubmitEditing={() => handleDelayedSubmit(hangerSubmitTimeoutRef, validateHangerInput)}
                  
                />
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>No. of hangers</Text>
                <TextInput
                  ref={numberOfHangersRef}
                  style={styles.modernInput}
                  placeholder="Enter number of hangers"
                  value={tagDetails.numberOfHangers}
                  onChangeText={(text) => updateField('numberOfHangers', text)}
                />
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Hanger Wgt (lb)</Text>
                <TextInput
                  style={styles.readOnlyInput}
                  value={tagDetails.hangerWeight}
                  onChangeText={(text) => updateField('hangerWeight', text)}
                  placeholder=""
                  editable={false}
                />
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>No. of Plants</Text>
                <TextInput
                  style={[
                    styles.modernInput,
                    tagDetails.numberOfPlants &&
                    parseFloat(tagDetails.numberOfPlants) > parseFloat(tagDetails.availablePlants) &&
                    styles.errorInput
                  ]}
                  value={tagDetails.numberOfPlants}
                  onChangeText={validateNumberOfPlants}
                  placeholder="Enter number of plants"
                  keyboardType="numeric"
                  ref={numberOfPlantsRef}
                  onSubmitEditing={handleNumberOfPlantsSubmit}
                  returnKeyType="next"
                />
                {tagDetails.numberOfPlants && parseFloat(tagDetails.numberOfPlants) > parseFloat(tagDetails.availablePlants) && (
                  <Text style={styles.errorText}>
                    Cannot exceed available plants ({tagDetails.availablePlants})
                  </Text>
                )}
                {tagDetails.numberOfPlants && parseFloat(tagDetails.numberOfPlants) <= parseFloat(tagDetails.availablePlants) && (
                  <Text style={styles.validationText}>
                    Valid: {tagDetails.numberOfPlants} ≤ {tagDetails.availablePlants}
                  </Text>
                )}
                {!tagDetails.numberOfPlants && (
                  <Text style={styles.helperText}>
                    Maximum allowed: {tagDetails.availablePlants} plants
                  </Text>
                )}
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Harvest Name</Text>
                <TextInput
                  style={styles.modernInput}
                  value={tagDetails.harvestName}
                  onChangeText={(text) => updateField('harvestName', text)}
                  placeholder="Enter harvest name"
                  ref={harvestNameDetailsRef}
                />
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Gross Wgt (lb)</Text>
                <TextInput
                  style={styles.modernInput}
                  value={tagDetails.grossWeight}
                  onChangeText={validateGrossWeight}
                  placeholder="Enter gross weight"
                  keyboardType="numeric"
                  ref={grossWeightRef}
                  onSubmitEditing={(e) => {
                    e.preventDefault();
                    handleGrossWeightSubmit();
                  }}
                  returnKeyType="done"
                />
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Net Wgt (lb)</Text>
                <TextInput
                  style={styles.readOnlyInput}
                  value={tagDetails.netWeight}
                  onChangeText={(text) => updateField('netWeight', text)}
                  editable={false}
                />
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Location</Text>
                <TouchableOpacity style={styles.dropdownInput} onPress={openLocationDropdown}>
                  <Text style={[styles.dropdownText, !tagDetails?.location && styles.placeholderText]}>
                    {tagDetails?.location || 'Select location'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </KeyboardAwareScrollView>



      {/* Location Dropdown Modal */}
      <Modal
        visible={showLocationDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLocationDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLocationDropdown(false)}
        >
          <View style={styles.dropdownModal}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Select Location</Text>
              <TouchableOpacity onPress={() => setShowLocationDropdown(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search locations..."
              value={locationSearchText}
              onChangeText={handleLocationSearch}
              autoFocus={true}
            />
            <FlatList
              data={filteredLocations}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => selectLocation(item)}
                >
                  <Text style={styles.dropdownItemText}>{item?.BinCode || 'Unnamed Location'}</Text>
                </TouchableOpacity>
              )}
              style={styles.dropdownList}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Fixed Footer with Submit and Cancel Buttons - Show when fields are visible */}
      {tagDetails && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 15) }]}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={isSubmitting ? styles.submitButtonDisabled : styles.submitButton}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Harvesting...' : 'Harvest Plants'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Alert Dialog Modal */}
      <Modal
        visible={showAlertDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={closeAlertDialog}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeAlertDialog}
        >
          <View style={styles.alertDialog}>
            <View style={styles.alertDialogHeader}>
              <View style={styles.alertDialogIconContainer}>
                {alertType === 'error' && (
                  <Ionicons name="close-circle" size={32} color="#d32f2f" />
                )}
                {alertType === 'warning' && (
                  <Ionicons name="warning" size={32} color="#f57c00" />
                )}
                {alertType === 'info' && (
                  <Ionicons name="information-circle" size={32} color="#1976d2" />
                )}
              </View>
              <Text style={[
                styles.alertDialogTitle,
                alertType === 'error' && styles.alertDialogTitleError,
                alertType === 'warning' && styles.alertDialogTitleWarning,
                alertType === 'info' && styles.alertDialogTitleInfo
              ]}>
                {alertTitle}
              </Text>
            </View>
            <Text style={styles.alertDialogMessage}>
              {alertMessage}
            </Text>
            <TouchableOpacity
              style={[
                styles.alertDialogButton,
                alertType === 'error' && styles.alertDialogButtonError,
                alertType === 'warning' && styles.alertDialogButtonWarning,
                alertType === 'info' && styles.alertDialogButtonInfo
              ]}
              onPress={closeAlertDialog}
            >
              <Text style={styles.alertDialogButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Batch Result Modal */}
      <Modal
        visible={showBatchResultModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeBatchResultModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeBatchResultModal}
        >
          <View style={styles.batchResultDialog}>
            <View style={styles.batchResultHeader}>
              <View style={styles.batchResultIconContainer}>
                {batchResultType === 'success' && (
                  <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
                )}
                {batchResultType === 'error' && (
                  <Ionicons name="close-circle" size={48} color="#d32f2f" />
                )}
              </View>
              <Text style={[
                styles.batchResultTitle,
                batchResultType === 'success' && styles.batchResultTitleSuccess,
                batchResultType === 'error' && styles.batchResultTitleError
              ]}>
                {batchResultTitle}
              </Text>
            </View>
            <View style={styles.batchResultContent}>
              <Text style={[
                styles.batchResultMessage,
                batchResultType === 'success' && styles.batchResultMessageSuccess,
                batchResultType === 'error' && styles.batchResultMessageError
              ]}>
                {batchResultMessage}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.batchResultButton,
                batchResultType === 'success' && styles.batchResultButtonSuccess,
                batchResultType === 'error' && styles.batchResultButtonError
              ]}
              onPress={closeBatchResultModal}
            >
              <Text style={styles.batchResultButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelLogout}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={cancelLogout}
        >
          <View style={styles.logoutModal}>
            <View style={styles.logoutModalHeader}>
              <Ionicons name="log-out-outline" size={32} color="#f44336" />
              <Text style={styles.logoutModalTitle}>Confirm Logout</Text>
            </View>
            <Text style={styles.logoutModalMessage}>
              Are you sure you want to logout? You will need to sign in again to access the app.
            </Text>
            <View style={styles.logoutModalButtons}>
              <TouchableOpacity style={styles.logoutCancelButton} onPress={cancelLogout}>
                <Text style={styles.logoutCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutConfirmButton} onPress={confirmLogout}>
                <Text style={styles.logoutConfirmButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Harvest Progress Modal */}
      <Modal
        visible={showHarvestProgressModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}} // Prevent closing during harvest process
      >
        <View style={styles.modalOverlay}>
          <View style={styles.harvestProgressModal}>
            <View style={styles.harvestProgressHeader}>
              <ActivityIndicator size="large" color="#53B253" />
              <Text style={styles.harvestProgressTitle}>Harvest in Progress</Text>
            </View>
            <Text style={styles.harvestProgressMessage}>
              Please wait while we process your harvest request. This may take a few moments.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Harvest Name Loading Modal */}
      <Modal
        visible={showHarvestNameLoadingModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}} // Prevent closing during loading
      >
        <View style={styles.modalOverlay}>
          <View style={styles.harvestNameLoadingModal}>
            <View style={styles.harvestNameLoadingHeader}>
              <ActivityIndicator size="large" color="#F0AB00" />
              <Text style={styles.harvestNameLoadingTitle}>Processing Harvest Name</Text>
            </View>
            <Text style={styles.harvestNameLoadingMessage}>
              Please wait while we validate and load harvest data...
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    // paddingVertical: 10,
    paddingTop: 22,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerLogo: {
    width: 140,
    height: 40,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernameText: {
    fontSize: 16,
    color: '#333',
    marginRight: 10,
    fontWeight: '500',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  content: {
    flex: 1,
    paddingTop: 8,
  },
  inputSection: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  sectionTitle: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  metrcInput: {
    borderWidth: 0,
    paddingLeft: 12,
    fontSize: 16,
    backgroundColor: 'transparent',
    color: 'black',
    fontWeight: '500',
    minHeight: 30,
  },

  detailsSection: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 10,
    marginBottom: 20,
    // marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 1,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2c5530',
    marginBottom: 25,
    textAlign: 'center',
  },
  detailsContent: {
    gap: 16,
  },
  detailRow: {
    marginBottom: 0,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  modernInput: {
    borderWidth: 0,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontWeight: '500',
    backgroundColor: 'white',
    color: 'black',
    minHeight: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  readOnlyInput: {
    borderWidth: 0,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    color: '#666',
    minHeight: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  dropdownInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#333',
    minHeight: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownText: {
    flex: 1,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#DB5F5F',
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#53B253',
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#cccccc',
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModal: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: '80%',
    maxHeight: '70%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  searchInput: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    margin: 15,
    backgroundColor: '#f9f9f9',
  },
  dropdownList: {
    maxHeight: 200, // Adjust as needed for the modal height
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownItemSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  calculationInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'right',
  },
  errorInput: {
    borderColor: '#ff6b6b',
    borderWidth: 2,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 5,
  },
  validationText: {
    color: '#4CAF50',
    fontSize: 12,
    marginTop: 5,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'right',
  },
  // Batch processing styles
  batchStatusContainer: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    margin: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  batchStatusText: {
    fontSize: 16,
    color: '#1976d2',
    textAlign: 'center',
    fontWeight: '600',
  },
  batchErrorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    margin: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  batchErrorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 10,
  },
  batchErrorText: {
    fontSize: 14,
    color: '#c62828',
    marginBottom: 5,
    lineHeight: 20,
  },
  clearErrorsButton: {
    backgroundColor: '#f44336',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignSelf: 'flex-end',
    marginTop: 10,
  },
  clearErrorsButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  // Harvest title styles
  harvestTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'black',
    textAlign: 'left',
    marginBottom: 15,
    letterSpacing: 0.3,
  },

  // Metrc input container styles
  metrcInputContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 5,
    paddingBottom: 5,
    borderWidth: 0,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metrcLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  metrcLabel: {
    fontSize: 14,
    color: 'black',
    fontWeight: '500',
  },
  loadingIndicator: {
    marginLeft: 8,
  },

  // Alert dialog styles
  alertDialog: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    padding: 24,
  },
  alertDialogHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  alertDialogIconContainer: {
    marginBottom: 12,
  },
  alertDialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
    textAlign: 'center',
  },
  alertDialogTitleError: {
    color: '#d32f2f',
  },
  alertDialogTitleWarning: {
    color: '#f57c00',
  },
  alertDialogTitleInfo: {
    color: '#1976d2',
  },
  alertDialogMessage: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  alertDialogButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#1976d2',
  },
  alertDialogButtonError: {
    backgroundColor: '#d32f2f',
  },
  alertDialogButtonWarning: {
    backgroundColor: '#f57c00',
  },
  alertDialogButtonInfo: {
    backgroundColor: '#1976d2',
  },
  alertDialogButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Logout modal styles
  logoutModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  logoutModalHeader: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logoutModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    textAlign: 'center',
  },
  logoutModalMessage: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    textAlign: 'center',
    padding: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  logoutModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 0,
    gap: 16,
  },
  logoutCancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  logoutCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#f44336',
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutConfirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Batch result modal styles
  batchResultDialog: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  batchResultHeader: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  batchResultIconContainer: {
    marginBottom: 12,
  },
  batchResultTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  batchResultTitleSuccess: {
    color: '#4CAF50',
  },
  batchResultTitleError: {
    color: '#d32f2f',
  },
  batchResultContent: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  batchResultMessage: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  batchResultMessageSuccess: {
    color: '#2e7d32',
  },
  batchResultMessageError: {
    color: '#c62828',
  },
  batchResultButton: {
    margin: 24,
    marginTop: 0,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  batchResultButtonSuccess: {
    backgroundColor: '#4CAF50',
  },
  batchResultButtonError: {
    backgroundColor: '#d32f2f',
  },
  batchResultButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Harvest progress modal styles
  harvestProgressModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    padding: 24,
  },
  harvestProgressHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  harvestProgressTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#53B253',
    marginTop: 12,
    textAlign: 'center',
  },
  harvestProgressMessage: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    textAlign: 'center',
  },
  // Harvest name loading modal styles
  harvestNameLoadingModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    padding: 24,
  },
  harvestNameLoadingHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  harvestNameLoadingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F0AB00',
    marginTop: 12,
    textAlign: 'center',
  },
  harvestNameLoadingMessage: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    textAlign: 'center',
  },
});
