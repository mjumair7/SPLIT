import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { fetchExercises, fetchSplits, logQuickSession, login, register } from "./src/services/api";

type Split = {
  id: string;
  name: string;
  goal: string | null;
};

type Exercise = {
  id: string;
  name: string;
};

export default function App() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("Jordan Train");
  const [email, setEmail] = useState("jordan@example.com");
  const [password, setPassword] = useState("password123");

  const [splits, setSplits] = useState<Split[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseId, setExerciseId] = useState("");
  const [reps, setReps] = useState("10");
  const [weightKg, setWeightKg] = useState("60");

  async function refreshData(currentToken: string) {
    setLoading(true);
    try {
      const [splitResponse, exerciseResponse] = await Promise.all([
        fetchSplits(currentToken),
        fetchExercises(currentToken)
      ]);
      setSplits(splitResponse.splits);
      setExercises(exerciseResponse.exercises);
      if (!exerciseId && exerciseResponse.exercises[0]) {
        setExerciseId(exerciseResponse.exercises[0].id);
      }
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Unable to fetch data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      return;
    }

    void refreshData(token);
  }, [token]);

  async function handleAuth() {
    setLoading(true);
    try {
      const response =
        mode === "register"
          ? await register({ name, email, password })
          : await login({ email, password });

      setToken(response.token);
    } catch (error) {
      Alert.alert("Auth error", error instanceof Error ? error.message : "Failed to authenticate");
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickLog() {
    if (!token || !exerciseId) {
      return;
    }

    setLoading(true);
    try {
      await logQuickSession(token, {
        exerciseId,
        reps: Number(reps),
        weightKg: Number(weightKg)
      });
      Alert.alert("Saved", "Workout set logged");
      await refreshData(token);
    } catch (error) {
      Alert.alert("Log error", error instanceof Error ? error.message : "Failed to log set");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Split Mobile</Text>
          <Text style={styles.subtitle}>Login or register to sync with your backend.</Text>

          {mode === "register" ? (
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Name" />
          ) : null}
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
          />

          <Pressable style={styles.button} onPress={handleAuth}>
            <Text style={styles.buttonText}>{mode === "register" ? "Create Account" : "Login"}</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => setMode(mode === "login" ? "register" : "login")}
          >
            <Text style={styles.buttonSecondaryText}>
              {mode === "login" ? "Switch to Register" : "Switch to Login"}
            </Text>
          </Pressable>
        </ScrollView>
        {loading ? <ActivityIndicator style={styles.loader} size="large" /> : null}
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Split Mobile Dashboard</Text>
        <Text style={styles.subtitle}>Quickly view splits and log a top set.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Log</Text>
          <TextInput
            style={styles.input}
            value={exerciseId}
            onChangeText={setExerciseId}
            placeholder="Exercise ID"
          />
          <Text style={styles.helper}>Use any exercise ID from the list below.</Text>
          <TextInput style={styles.input} value={reps} onChangeText={setReps} placeholder="Reps" keyboardType="numeric" />
          <TextInput
            style={styles.input}
            value={weightKg}
            onChangeText={setWeightKg}
            placeholder="Weight (kg)"
            keyboardType="numeric"
          />

          <Pressable style={styles.button} onPress={handleQuickLog}>
            <Text style={styles.buttonText}>Log Set</Text>
          </Pressable>

          <Pressable style={[styles.button, styles.buttonSecondary]} onPress={() => token && refreshData(token)}>
            <Text style={styles.buttonSecondaryText}>Refresh Data</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => {
              setToken(null);
              setSplits([]);
              setExercises([]);
            }}
          >
            <Text style={styles.buttonSecondaryText}>Logout</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Exercises</Text>
          {exercises.map((exercise) => (
            <Text style={styles.listItem} key={exercise.id}>
              {exercise.name} ({exercise.id})
            </Text>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Splits</Text>
          {splits.map((split) => (
            <Text style={styles.listItem} key={split.id}>
              {split.name} {split.goal ? `• ${split.goal}` : ""}
            </Text>
          ))}
        </View>
      </ScrollView>
      {loading ? <ActivityIndicator style={styles.loader} size="large" /> : null}
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f4f2e9"
  },
  container: {
    padding: 20,
    gap: 16
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#101820"
  },
  subtitle: {
    color: "#374151"
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 14,
    gap: 8
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827"
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff"
  },
  button: {
    marginTop: 4,
    backgroundColor: "#0f172a",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  buttonText: {
    color: "white",
    fontWeight: "600"
  },
  buttonSecondary: {
    backgroundColor: "#eef2ff",
    borderWidth: 1,
    borderColor: "#c7d2fe"
  },
  buttonSecondaryText: {
    color: "#1e293b",
    fontWeight: "600"
  },
  helper: {
    color: "#475569",
    fontSize: 12
  },
  listItem: {
    color: "#111827",
    fontSize: 13,
    marginBottom: 4
  },
  loader: {
    position: "absolute",
    right: 20,
    bottom: 20
  }
});
