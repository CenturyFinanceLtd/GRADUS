import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import Pdf from "react-native-pdf";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";

export default function PdfViewerScreen() {
  const { url, title } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const pdfUrl = Array.isArray(url) ? url[0] : url;
  const rawTitle = Array.isArray(title) ? title[0] : title;
  const pageTitle = rawTitle?.replace(/\.pdf$/i, "") || "View Notes";

  const source = { uri: pdfUrl, cache: true };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.titleScrollContainer}
          contentContainerStyle={styles.titleScrollContent}
        >
          <Text style={styles.headerTitle}>{pageTitle || "View Notes"}</Text>
        </ScrollView>
        {/* Empty view to balance the header */}
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.pdfContainer}>
        <Pdf
          trustAllCerts={false}
          source={source}
          onLoadComplete={(numberOfPages, filePath) => {
            console.log(`Number of pages: ${numberOfPages}`);
            setLoading(false);
          }}
          onPageChanged={(page, numberOfPages) => {
            console.log(`Current page: ${page}`);
          }}
          onError={(error) => {
            console.log(error);
            setLoading(false);
          }}
          onPressLink={(uri) => {
            console.log(`Link pressed: ${uri}`);
          }}
          style={styles.pdf}
        />
        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#2968ff" />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    // flex: 1, // Removed flex: 1 as it's now inside ScrollView
    // textAlign: "center", // Text align handled by scrollview content style
  },
  titleScrollContainer: {
    flex: 1,
    marginHorizontal: 10,
  },
  titleScrollContent: {
    alignItems: "center",
    paddingVertical: 4, // Center vertically
    // minWidth: '100%', // Optional: use this if we want centering when short
  },
  pdfContainer: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  pdf: {
    flex: 1,
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
    backgroundColor: "#f5f5f5",
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
  },
});
