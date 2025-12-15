import { useState, useEffect, useRef } from "react";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import { API_BASE_URL } from "@/constants/config";
import { getAuthSession } from "@/utils/auth-storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const usePushNotifications = () => {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<
    Notifications.Notification | undefined
  >();
  const notificationListener = useRef<Notifications.EventSubscription>(null);
  const responseListener = useRef<Notifications.EventSubscription>(null);
  const router = useRouter();

  async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        console.log("Failed to get push token for push notification!");
        return;
      }
      
      try {
        const projectId =
            Constants?.expoConfig?.extra?.eas?.projectId ??
            Constants?.easConfig?.projectId;
            
        token = (
          await Notifications.getExpoPushTokenAsync({
            projectId,
          })
        ).data;
        console.log("Push Token:", token);
      } catch (e: any) {
        // Squelch the error for missing google-services.json so it doesn't annoy the user
        if (e.message.includes("FirebaseApp is not initialized")) {
             console.log("Push Notifications skipped (missing google-services.json)");
        } else {
             console.log("Error getting push token:", e); // Use log instead of error to avoid red screen
        }
      }
    } else {
      console.log("Must use physical device for Push Notifications");
    }

    return token;
  }

  // Send Token to Backend
  const sendTokenToBackend = async (token: string) => {
    try {
        const session = await getAuthSession();
        if (!session || !session.token) return;

        // Try to update user profile with push token
        // Assuming PATCH /api/users/me is the flexible endpoint
        // Or specific endpoint if available
        const res = await fetch(`${API_BASE_URL}/api/users/push-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`
            },
            body: JSON.stringify({ pushToken: token })
        });
        
        if (!res.ok) {
             // Fallback to /api/users/me if specific endpoint fails
             await fetch(`${API_BASE_URL}/api/users/me`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.token}`
                },
                body: JSON.stringify({ pushToken: token })
            });
        }
        console.log("Push token sent to backend");

    } catch (e) {
        console.warn("Failed to send push token to backend", e);
    }
  };

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      setExpoPushToken(token);
      if (token) {
        sendTokenToBackend(token);
      }
    });

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        setNotification(notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        // Handle deep linking or navigation based on notification data
        if (data?.url) {
            router.push(data.url as any);
        } else if (data?.liveId) {
            router.push(`/live/${data.liveId}` as any);
        }
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return {
    expoPushToken,
    notification,
  };
};
