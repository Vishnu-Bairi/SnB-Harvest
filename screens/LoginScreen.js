import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URLS, COMPANY_CONFIG } from '../config/api';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Custom alert states
  const [showCustomAlert, setShowCustomAlert] = useState(false);
  const [customAlertTitle, setCustomAlertTitle] = useState('');
  const [customAlertMessage, setCustomAlertMessage] = useState('');
  const [customAlertType, setCustomAlertType] = useState('info'); // 'info', 'warning', 'error'

  // Input validation states
  const [usernameError, setUsernameError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  // Check for existing auth token on component mount
  useEffect(() => {
    checkAuthToken();
  }, []);

  const generateBasicAuthToken = (username, password) => {
    const credentials = `${username}:${password}`;
    return btoa(credentials); // Base64 encoding
  };

  const checkAuthToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUsername = await AsyncStorage.getItem('username');
      
      if (storedToken && storedUsername) {
        // Validate the token by making a test API call
        try {
          const response = await fetch(API_URLS.USERS_SERVICE, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${storedToken}`,
            }
          });

          if (response.ok) {
            // Token is valid, navigate to Home screen
            navigation.replace('Home');
            return;
          } else {
            // Token is invalid, clear stored data
            await AsyncStorage.removeItem('authToken');
            await AsyncStorage.removeItem('username');
            await AsyncStorage.removeItem('currentUser');
          }
        } catch (error) {
          console.error('Error validating auth token:', error);
          // Clear stored data on validation error
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('username');
          await AsyncStorage.removeItem('currentUser');
        }
      }
    } catch (error) {
      console.error('Error checking auth token:', error);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // Custom alert display function
  const showCustomAlertMessage = (title, message, type = 'info') => {
    setCustomAlertTitle(title);
    setCustomAlertMessage(message);
    setCustomAlertType(type);
    setShowCustomAlert(true);
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setShowCustomAlert(false);
    }, 5000);
  };

  // Specific functions for login alerts
  const showCredentialsInvalidAlert = (message = 'Invalid username or password. Please check your credentials and try again.') => {
    showCustomAlertMessage('Authentication Failed', message, 'error');
  };

  const showLoginFailedAlert = (message = 'Login failed. Please try again.') => {
    showCustomAlertMessage('Login Failed', message, 'error');
  };

  const showNetworkErrorAlert = (message = 'Network connection error. Please check your internet connection and try again.') => {
    showCustomAlertMessage('Network Error', message, 'error');
  };

  const showValidationErrorAlert = (message = 'Please enter both username and password') => {
    showCustomAlertMessage('Required Fields', message, 'warning');
  };

  const showMissingUsernameAlert = () => {
    showCustomAlertMessage('Username Required', 'Please enter your username to continue.', 'warning');
  };

  const showMissingPasswordAlert = () => {
    showCustomAlertMessage('Password Required', 'Please enter your password to continue.', 'warning');
  };

  // Enhanced credential error messages
  const showInvalidUsernameAlert = () => {
    showCustomAlertMessage(
      'Invalid Username', 
      'The username you entered does not exist. Please check your username and try again.',
      'error'
    );
  };

  const showInvalidPasswordAlert = () => {
    showCustomAlertMessage(
      'Invalid Password', 
      'The password you entered is incorrect. Please check your password and try again.',
      'error'
    );
  };

  const showAccountLockedAlert = () => {
    showCustomAlertMessage(
      'Account Locked', 
      'Your account has been locked due to multiple failed login attempts. Please contact support.',
      'error'
    );
  };

  // Input validation functions
  const validateUsername = (text) => {
    setUsername(text);
    setUsernameError(false);
  };

  const validatePassword = (text) => {
    setPassword(text);
    setPasswordError(false);
  };

  const validateInputs = () => {
    let hasError = false;
    
    if (!username.trim()) {
      setUsernameError(true);
      hasError = true;
    }
    
    if (!password.trim()) {
      setPasswordError(true);
      hasError = true;
    }
    
    return !hasError;
  };

  const showSpecificValidationError = () => {
    if (!username.trim() && !password.trim()) {
      showValidationErrorAlert();
    } else if (!username.trim()) {
      showMissingUsernameAlert();
    } else if (!password.trim()) {
      showMissingPasswordAlert();
    }
  };

  const handleLogin = async () => {
    if (!validateInputs()) {
      showSpecificValidationError();
      return;
    }

    setIsLoading(true);

    try {
      console.log('handleLogin called with username:', username,'company:', COMPANY_CONFIG.DB, 'and password:', password);
      // Generate basic auth token
      const username_CompanyDB = {
        CompanyDB: COMPANY_CONFIG.DB,
        UserName: username,
      }
      const authToken = generateBasicAuthToken(JSON.stringify(username_CompanyDB), password);

      // Business One Service Layer login API call
      const response = await fetch(API_URLS.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          CompanyDB: COMPANY_CONFIG.DB,
          UserName: username,
          Password: password
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store auth token in local storage
        await AsyncStorage.setItem('authToken', authToken);
        await AsyncStorage.setItem('username', username);
        
        // Call UsersService_GetCurrentUser endpoint to get current user details
        try {
          const userResponse = await fetch(API_URLS.USERS_SERVICE, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${authToken}`,
            }
          });

          if (userResponse.ok) {
            const userData = await userResponse.json();
            // Store the full user data and username from the service
            if (userData && userData.UserName) {
              await AsyncStorage.setItem('currentUser', JSON.stringify(userData));
              await AsyncStorage.setItem('username', userData.UserName);
            }
          } else {
            console.log('Failed to get current user details, using login username');
          }
        } catch (userError) {
          console.log('Error getting current user details:', userError);
          // Continue with login even if user details fetch fails
        }
        
        // Login successful
        navigation.replace('Home');
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.Message || 'Invalid credentials';
        
        // Provide more specific error messages based on common scenarios
        if (errorMessage.toLowerCase().includes('username') || errorMessage.toLowerCase().includes('user')) {
          showInvalidUsernameAlert();
        } else if (errorMessage.toLowerCase().includes('password') || errorMessage.toLowerCase().includes('pass')) {
          showInvalidPasswordAlert();
        } else if (errorMessage.toLowerCase().includes('locked') || errorMessage.toLowerCase().includes('blocked')) {
          showAccountLockedAlert();
        } else {
          showLoginFailedAlert(errorMessage);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      showNetworkErrorAlert();
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading screen while checking authentication
  if (isCheckingAuth) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Image
            source={require('../assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.loadingText}>Checking authentication...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Login Form Container */}
      <View style={styles.formContainer}>
        {/* Logo Image inside the container */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.welcomeText}>Welcome Back</Text>
        <Text style={styles.subtitleText}>Sign in to continue</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Username</Text>
          <TextInput
            style={[styles.input, usernameError && styles.inputError]}
            placeholder="Enter your username"
            value={username}
            onChangeText={validateUsername}
            editable={!isLoading}
          />
          {usernameError && <Text style={styles.errorText}>Username is required</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={[styles.input, passwordError && styles.inputError]}
            placeholder="Enter your password"
            value={password}
            onChangeText={validatePassword}
            secureTextEntry
            editable={!isLoading}
          />
          {passwordError && <Text style={styles.passwordErrorText}>Password is required</Text>}
        </View>

        <TouchableOpacity 
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} 
          onPress={handleLogin}
          disabled={isLoading}
        >
          <Text style={styles.loginButtonText}>
            {isLoading ? 'Logging in...' : 'Login'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Custom Alert Messages */}
      {showCustomAlert && (
        <Modal
          visible={showCustomAlert}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCustomAlert(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setShowCustomAlert(false)}
          >
            <View style={[
              styles.customAlertModal,
              customAlertType === 'error' && styles.customAlertModalError,
              customAlertType === 'warning' && styles.customAlertModalWarning,
              customAlertType === 'info' && styles.customAlertModalInfo
            ]}>
              <View style={styles.customAlertModalHeader}>
                {customAlertType === 'error' && (
                  <Ionicons name="close-circle" size={48} color="#d32f2f" />
                )}
                {customAlertType === 'warning' && (
                  <Ionicons name="warning" size={48} color="#f57c00" />
                )}
                {customAlertType === 'info' && (
                  <Ionicons name="information-circle" size={48} color="#1976d2" />
                )}
              </View>
              <View style={styles.customAlertModalContent}>
                <Text style={[
                  styles.customAlertModalTitle,
                  customAlertType === 'error' && styles.customAlertModalTitleError,
                  customAlertType === 'warning' && styles.customAlertModalTitleWarning,
                  customAlertType === 'info' && styles.customAlertModalTitleInfo
                ]}>
                  {customAlertTitle}
                </Text>
                <Text style={[
                  styles.customAlertModalMessage,
                  customAlertType === 'error' && styles.customAlertModalMessageError,
                  customAlertType === 'warning' && styles.customAlertModalMessageWarning,
                  customAlertType === 'info' && styles.customAlertModalMessageInfo
                ]}>
                  {customAlertMessage}
                </Text>
              </View>
              <TouchableOpacity 
                style={[
                  styles.customAlertModalButton,
                  customAlertType === 'error' && styles.customAlertModalButtonError,
                  customAlertType === 'warning' && styles.customAlertModalButtonWarning,
                  customAlertType === 'info' && styles.customAlertModalButtonInfo
                ]}
                onPress={() => setShowCustomAlert(false)}
              >
                <Text style={styles.customAlertModalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
    // paddingTop: 10,
    // paddingBottom: 10,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 15,
    paddingTop: 1,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  logoContainer: {
    alignItems: 'center'
  },
  logo: {
    width: 250,
    height: 100,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 35,
  },
  inputContainer: {
    marginBottom: 22,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 18,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  inputError: {
    borderColor: '#d32f2f',
    backgroundColor: '#fff5f5',
  },
  loginButton: {
    backgroundColor: '#F0AB00',
    paddingVertical: 18,
    borderRadius: 25,
    marginTop: 25,
    alignItems: 'center',
    shadowColor: '#F0AB00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  loginButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 25,
  },
  forgotPasswordText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '500',
  },

  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginTop: 5,
  },
  passwordErrorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  customAlertModal: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    width: '80%',
    maxWidth: 350,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  customAlertModalHeader: {
    marginBottom: 20,
  },
  customAlertModalContent: {
    alignItems: 'center',
    marginBottom: 25,
  },
  customAlertModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  customAlertModalTitleError: {
    color: '#d32f2f',
  },
  customAlertModalTitleWarning: {
    color: '#f57c00',
  },
  customAlertModalTitleInfo: {
    color: '#1976d2',
  },
  customAlertModalMessage: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
  },
  customAlertModalMessageError: {
    color: '#d32f2f',
  },
  customAlertModalMessageWarning: {
    color: '#f57c00',
  },
  customAlertModalMessageInfo: {
    color: '#1976d2',
  },
  customAlertModalButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  customAlertModalButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  customAlertModalButtonError: {
    backgroundColor: '#d32f2f',
  },
  customAlertModalButtonWarning: {
    backgroundColor: '#f57c00',
  },
  customAlertModalButtonInfo: {
    backgroundColor: '#1976d2',
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
    marginTop: 20,
    textAlign: 'center',
  },
});
