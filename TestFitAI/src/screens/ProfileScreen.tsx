import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import userService, { UserProfile } from '../services/userService';
import { ApiError } from '../services/apiService';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setError(null);
      const data = await userService.getProfile();
      setProfile(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Error ${err.status}: ${err.message}`);
        if (err.status === 401) {
          Alert.alert(
            'Sesión Expirada',
            'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
            [{ text: 'OK' }]
          );
        }
      } else {
        setError('Error al cargar el perfil');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text>No se pudo cargar el perfil</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.name}>
          {profile.firstName} {profile.lastName}
        </Text>
        <Text style={styles.email}>{profile.email}</Text>
        <View style={styles.planBadge}>
          <Text style={styles.planText}>
            Plan {profile.subscription.plan.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Objetivos de Fitness</Text>
        {profile.preferences.fitnessGoals.map((goal, index) => (
          <View key={index} style={styles.item}>
            <Text style={styles.itemText}>{goal}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nivel de Experiencia</Text>
        <Text style={styles.value}>{profile.preferences.experienceLevel}</Text>
      </View>

      {profile.preferences.availableTime && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tiempo Disponible</Text>
          <Text style={styles.value}>{profile.preferences.availableTime} minutos/día</Text>
        </View>
      )}

      {profile.preferences.equipment && profile.preferences.equipment.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Equipamiento</Text>
          {profile.preferences.equipment.map((equip, index) => (
            <View key={index} style={styles.item}>
              <Text style={styles.itemText}>{equip}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información de Suscripción</Text>
        <Text style={styles.value}>
          Estado: {profile.subscription.status === 'active' ? 'Activa' : 'Inactiva'}
        </Text>
        {profile.subscription.expiresAt && (
          <Text style={styles.value}>
            Expira: {new Date(profile.subscription.expiresAt).toLocaleDateString('es-CL')}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    color: '#ff3333',
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  planBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 10,
  },
  planText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 10,
    padding: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  value: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  item: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    marginBottom: 5,
  },
  itemText: {
    fontSize: 16,
    color: '#333',
  },
});