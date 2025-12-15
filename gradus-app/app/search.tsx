import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL } from "@/constants/config";

// Reusing types roughly
type Course = {
  id: string;
  name: string;
  imageUrl: string;
  slug: string;
};

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [allCourses, setAllCourses] = useState<Course[]>([]); // Cache for client-side filtering simplicity

  // Load all courses once for instant search (if list is small)
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/courses`);
        const data = await res.json();
        const items = Array.isArray(data.items) ? data.items : [];
        setAllCourses(
          items.map((c: any) => ({
            id: c._id || c.id,
            name: c.name,
            imageUrl: c.imageUrl,
            slug: c.slug,
          }))
        );
      } catch (err) {
        console.error(err);
      }
    };
    fetchCourses();
  }, []);

  const handleSearch = (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setResults([]);
      return;
    }
    const lower = text.toLowerCase();
    const filtered = allCourses.filter((c) =>
      c.name.toLowerCase().includes(lower)
    );
    setResults(filtered);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.input}
            placeholder="Search courses..."
            value={query}
            onChangeText={handleSearch}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch("")}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          query.length > 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                No courses found for "{query}"
              </Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                Type to find courses or mentors
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.resultItem}
            onPress={() =>
              router.push({
                pathname: "/learning-hub/course/[id]",
                params: {
                  id: item.slug,
                  name: item.name,
                  imageUrl: item.imageUrl,
                },
              })
            }
          >
            <Ionicons name="book-outline" size={20} color="#2968ff" />
            <Text style={styles.resultText}>{item.name}</Text>
            <Ionicons name="chevron-forward" size={16} color="#ccc" />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingTop: Platform.OS === "android" ? 16 : 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f2f5",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 44,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#111",
  },
  list: {
    padding: 16,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    gap: 12,
  },
  resultText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  empty: {
    marginTop: 50,
    alignItems: "center",
  },
  emptyText: {
    color: "#888",
    fontSize: 16,
  },
});
