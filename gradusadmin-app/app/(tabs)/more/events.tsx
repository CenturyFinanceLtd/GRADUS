import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { adminApi } from "../../../services/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { Colors } from "../../../constants";

interface Event {
  _id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  venue?: string;
  status: string;
  registrations?: number;
}

export default function EventsScreen() {
  const { isAuthenticated } = useAdminAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const response = await adminApi.getEvents();
      setEvents(response?.items || []);
    } catch (error) {
      console.log("Failed to load events:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadEvents();
    }
  }, [isAuthenticated]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }, []);

  const handleDelete = (id: string) => {
    Alert.alert("Delete Event", "Are you sure you want to delete this event?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await adminApi.deleteEvent(id);
            loadEvents();
          } catch (error: any) {
            Alert.alert("Error", error.message);
          }
        },
      },
    ]);
  };

  const renderEvent = ({ item }: { item: Event }) => {
    const eventDate = new Date(item.date);
    const isPast = eventDate < new Date();

    return (
      <View style={[styles.eventCard, isPast && styles.eventCardPast]}>
        <View style={styles.dateBox}>
          <Text style={styles.dateDay}>{eventDate.getDate()}</Text>
          <Text style={styles.dateMonth}>
            {eventDate.toLocaleString("default", { month: "short" })}
          </Text>
        </View>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          {item.venue && <Text style={styles.eventVenue}>📍 {item.venue}</Text>}
          {item.time && <Text style={styles.eventTime}>🕐 {item.time}</Text>}
          <View style={styles.eventMeta}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isPast
                    ? Colors.textSecondary + "20"
                    : Colors.success + "20",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: isPast ? Colors.textSecondary : Colors.success },
                ]}
              >
                {isPast ? "Past" : item.status || "Upcoming"}
              </Text>
            </View>
            {item.registrations !== undefined && (
              <Text style={styles.registrations}>
                👥 {item.registrations} registered
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item._id)}
        >
          <Text style={styles.deleteBtnText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <Text>Loading events...</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item, index) => item._id || `event-${index}`}
          renderItem={renderEvent}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No events found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    color: Colors.textSecondary,
  },
  eventCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  eventCardPast: {
    opacity: 0.7,
  },
  dateBox: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  dateDay: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
  },
  dateMonth: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 4,
  },
  eventVenue: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  eventTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  eventMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  registrations: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  deleteBtn: {
    padding: 8,
  },
  deleteBtnText: {
    fontSize: 18,
  },
});
