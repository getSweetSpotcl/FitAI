import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  Button, 
  Alert,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import authService from './src/services/authService';
import ProfileScreen from './src/screens/ProfileScreen';
import { ApiError } from './src/services/apiService';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresa email y contraseña');
      return;
    }

    setLoading(true);
    try {
      // Note: The real API uses Clerk authentication, so this is just for demonstration
      // In a real app, you would use Clerk SDK for authentication
      Alert.alert(
        'Info', 
        'La API real usa Clerk para autenticación. Para probar, usa el token JWT desde la web app.'
      );
      
      // For demo purposes, you can manually set a token here
      // authService.setToken('your-jwt-token-here');
      // setIsLoggedIn(true);
    } catch (error) {
      if (error instanceof ApiError) {
        Alert.alert('Error de Login', error.message);
      } else {
        Alert.alert('Error', 'Error al iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetToken = () => {
    Alert.prompt(
      'Configurar Token JWT',
      'Pega el token JWT obtenido desde la aplicación web:',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: (token) => {
            if (token) {
              authService.setToken(token);
              setIsLoggedIn(true);
              Alert.alert('Éxito', 'Token configurado correctamente');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleLogout = () => {
    authService.clearToken();
    setIsLoggedIn(false);
    setEmail('');
    setPassword('');
  };

  if (isLoggedIn) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>FitAI - Conectado a API Real</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
        <ProfileScreen />
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.loginContainer}>
      <View style={styles.loginBox}>
        <Text style={styles.title}>FitAI</Text>
        <Text style={styles.subtitle}>Conectar con API Real</Text>
        
        <Text style={styles.infoText}>
          La API usa Clerk para autenticación. Para probar:
        </Text>
        <Text style={styles.steps}>
          1. Abre la web app en: http://localhost:3001{"\n"}
          2. Inicia sesión con Clerk{"\n"}
          3. Abre Developer Tools (F12){"\n"}
          4. En la consola ejecuta:{"\n"}
          <Text style={styles.code}>
            window.Clerk.session.getToken().then(token => console.log('Token:', token))
          </Text>
          {"\n"}
          5. Copia el token y pégalo aquí
        </Text>

        <TouchableOpacity style={styles.tokenButton} onPress={handleSetToken}>
          <Text style={styles.tokenButtonText}>Configurar Token JWT</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <Text style={styles.orText}>O ingresa manualmente (demo):</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity 
          style={[styles.loginButton, loading && styles.disabledButton]} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
          )}
        </TouchableOpacity>
      </View>
      <StatusBar style="auto" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loginContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  loginBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FF6B6B',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  steps: {
    fontSize: 13,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 11,
    backgroundColor: '#f0f0f0',
    padding: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tokenButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  tokenButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
  orText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 15,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    padding: 10,
    borderRadius: 5,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
