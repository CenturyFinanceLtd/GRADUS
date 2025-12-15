import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  SafeAreaView,
  PanResponder,
} from "react-native";
import { adminApi } from "../../../services/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { Colors } from "../../../constants";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.85;

interface EmailAddress {
  name?: string;
  email?: string;
  value?: string;
}

interface Attachment {
  id?: string;
  attachmentId?: string;
  filename: string;
  mimeType: string;
  size?: number;
}

interface Email {
  _id?: string;
  id?: string;
  messageId?: string;
  from: string | EmailAddress | EmailAddress[];
  to: string | EmailAddress | EmailAddress[];
  cc?: string | EmailAddress | EmailAddress[];
  bcc?: string | EmailAddress | EmailAddress[];
  subject: string;
  body?: string;
  text?: string;
  textBody?: string;
  html?: string;
  htmlBody?: string;
  snippet?: string;
  date?: string;
  receivedAt?: string;
  internalDate?: number;
  isRead?: boolean;
  read?: boolean;
  unread?: boolean;
  isStarred?: boolean;
  starred?: boolean;
  labelIds?: string[];
  attachments?: Attachment[];
  hasAttachments?: boolean;
}

interface Account {
  id: string;
  email: string;
  name: string;
  unreadCount?: number;
}

interface Label {
  id: string;
  name: string;
  icon: string;
  count?: number;
}

// Gmail-style folders - IDs must match Gmail API exactly
// Note: SNOOZED removed as it's not accessible via service accounts
const FOLDERS: Label[] = [
  { id: "INBOX", name: "Inbox", icon: "📥" },
  { id: "STARRED", name: "Starred", icon: "⭐" },
  { id: "IMPORTANT", name: "Important", icon: "🏷️" },
  { id: "SENT", name: "Sent", icon: "📤" },
  { id: "DRAFT", name: "Drafts", icon: "📝" },
  { id: "TRASH", name: "Trash", icon: "🗑️" },
  { id: "SPAM", name: "Spam", icon: "⚠️" },
];

// Gmail-style categories - IDs must match Gmail API exactly
const CATEGORIES: Label[] = [
  { id: "CATEGORY_PERSONAL", name: "Primary", icon: "📧" },
  { id: "CATEGORY_SOCIAL", name: "Social", icon: "👥" },
  { id: "CATEGORY_PROMOTIONS", name: "Promotions", icon: "🏷️" },
  { id: "CATEGORY_UPDATES", name: "Updates", icon: "ℹ️" },
  { id: "CATEGORY_FORUMS", name: "Forums", icon: "💬" },
];

// Helper functions
const formatEmailAddress = (
  addr: string | EmailAddress | EmailAddress[] | undefined
): string => {
  if (!addr) return "Unknown";
  if (typeof addr === "string") return addr;
  if (Array.isArray(addr)) {
    const first = addr[0];
    if (!first) return "Unknown";
    return first.name || first.email || first.value || "Unknown";
  }
  return addr.name || addr.email || addr.value || "Unknown";
};

const getInitials = (name: string): string => {
  const parts = name.split(/[@\s]+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const getAvatarColor = (name: string): string => {
  const colors = [
    "#F44336",
    "#E91E63",
    "#9C27B0",
    "#673AB7",
    "#3F51B5",
    "#2196F3",
    "#03A9F4",
    "#00BCD4",
    "#009688",
    "#4CAF50",
    "#8BC34A",
    "#CDDC39",
    "#FFC107",
    "#FF9800",
    "#FF5722",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return "";

  const date = new Date(dateStr);

  // Check for invalid date
  if (isNaN(date.getTime())) {
    // Try parsing as timestamp
    const timestamp = parseInt(dateStr, 10);
    if (!isNaN(timestamp)) {
      const tsDate = new Date(timestamp);
      if (!isNaN(tsDate.getTime())) {
        return formatValidDate(tsDate);
      }
    }
    return "";
  }

  return formatValidDate(date);
};

const formatValidDate = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (days < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  } else if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
};

export default function GmailStyleEmailsScreen() {
  const { isAuthenticated, admin } = useAdminAuth();

  // State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [selectedLabel, setSelectedLabel] = useState<string>("INBOX");
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Compose
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);

  // Email detail
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [fullEmailContent, setFullEmailContent] = useState<Email | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showEmailDetails, setShowEmailDetails] = useState(false);

  // Load accounts
  useEffect(() => {
    if (isAuthenticated) {
      loadAccounts();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && selectedAccount) {
      loadEmails();
    }
  }, [isAuthenticated, selectedAccount, selectedLabel]);

  const loadAccounts = async () => {
    try {
      const response = await adminApi.getEmailAccounts();
      const accs = response?.accounts || [];
      const formattedAccounts: Account[] = accs.map((acc: any) => ({
        id: acc.email || acc.id,
        email: acc.email,
        name: acc.name || acc.email?.split("@")[0] || "Account",
        unreadCount: acc.unreadCount || acc.messageCount,
      }));
      setAccounts(formattedAccounts);
      if (formattedAccounts.length > 0 && !selectedAccount) {
        setSelectedAccount(formattedAccounts[0].email);
      }
    } catch (error) {
      console.log("Failed to load accounts:", error);
    }
  };

  const loadEmails = async () => {
    if (!selectedAccount) {
      setLoading(false);
      return;
    }
    try {
      const response = await adminApi.getEmailMessages(
        selectedAccount,
        selectedLabel
      );
      setEmails(response?.messages || []);
    } catch (error) {
      console.log("Failed to load emails:", error);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEmails();
    setRefreshing(false);
  }, [selectedAccount, selectedLabel]);

  const handleOpenEmail = async (email: Email) => {
    setSelectedEmail(email);
    setFullEmailContent(null);
    setLoadingDetail(true);

    const messageId = email._id || email.id || email.messageId;
    if (messageId && selectedAccount) {
      try {
        const response = await adminApi.getEmailMessage(
          messageId,
          selectedAccount
        );
        if (response?.message) {
          setFullEmailContent(response.message);
        }
      } catch (error) {
        console.log("Failed to load full email:", error);
      }
    }
    setLoadingDetail(false);
  };

  // Switch to next/previous account (for swipe gesture)
  const switchToNextAccount = useCallback(() => {
    if (accounts.length <= 1) return;
    const currentIndex = accounts.findIndex(
      (acc) => acc.email === selectedAccount
    );
    const nextIndex = (currentIndex + 1) % accounts.length;
    setSelectedAccount(accounts[nextIndex].email);
  }, [accounts, selectedAccount]);

  const switchToPrevAccount = useCallback(() => {
    if (accounts.length <= 1) return;
    const currentIndex = accounts.findIndex(
      (acc) => acc.email === selectedAccount
    );
    const prevIndex =
      currentIndex <= 0 ? accounts.length - 1 : currentIndex - 1;
    setSelectedAccount(accounts[prevIndex].email);
  }, [accounts, selectedAccount]);

  // Store latest callback refs to avoid stale closures in PanResponder
  const switchNextRef = useRef(switchToNextAccount);
  const switchPrevRef = useRef(switchToPrevAccount);

  useEffect(() => {
    switchNextRef.current = switchToNextAccount;
    switchPrevRef.current = switchToPrevAccount;
  }, [switchToNextAccount, switchToPrevAccount]);

  // Get current account info
  const currentAccountInfo = accounts.find(
    (acc) => acc.email === selectedAccount
  );

  // PanResponder for swipe gesture on avatar (swipe up/down to switch accounts)
  const avatarPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 15,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -25) {
          // Swipe up -> next account
          switchNextRef.current();
        } else if (gestureState.dy > 25) {
          // Swipe down -> previous account
          switchPrevRef.current();
        }
      },
    })
  ).current;

  const handleSend = async () => {
    if (!composeTo.trim() || !composeSubject.trim()) {
      Alert.alert("Error", "Please fill in To and Subject");
      return;
    }
    setSending(true);
    try {
      await adminApi.sendEmail({
        to: composeTo.trim(),
        subject: composeSubject.trim(),
        body: composeBody.trim(),
      });
      Alert.alert("Success", "Email sent!");
      setShowCompose(false);
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const currentAccount = accounts.find((a) => a.email === selectedAccount);

  // Render email item
  const renderEmail = ({ item }: { item: Email }) => {
    const from = formatEmailAddress(item.from);
    const initials = getInitials(from);
    const avatarColor = getAvatarColor(from);
    // Gmail API uses 'unread' boolean
    const isUnread =
      item.unread === true || item.isRead === false || item.read === false;
    const isStarred = item.isStarred || item.starred;
    const hasAttachment =
      item.hasAttachments || (item.attachments && item.attachments.length > 0);
    const snippet =
      item.snippet || item.textBody || item.body || item.text || "";
    // Use receivedAt (ISO string) or internalDate (timestamp) from Gmail API
    const emailDate =
      item.receivedAt ||
      item.date ||
      (item.internalDate
        ? new Date(item.internalDate).toISOString()
        : undefined);

    return (
      <TouchableOpacity
        style={[styles.emailItem, isUnread && styles.emailItemUnread]}
        onPress={() => handleOpenEmail(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.emailContent}>
          <View style={styles.emailTopRow}>
            <Text
              style={[styles.emailSender, isUnread && styles.emailSenderUnread]}
              numberOfLines={1}
            >
              {from}
            </Text>
            <Text style={styles.emailDate}>{formatDate(emailDate)}</Text>
          </View>
          <Text
            style={[styles.emailSubject, isUnread && styles.emailSubjectUnread]}
            numberOfLines={1}
          >
            {item.subject || "(No Subject)"}
          </Text>
          <View style={styles.emailBottomRow}>
            <Text style={styles.emailSnippet} numberOfLines={1}>
              {snippet}
            </Text>
            {hasAttachment && <Text style={styles.attachmentIcon}>📎</Text>}
          </View>
        </View>
        <TouchableOpacity style={styles.starButton}>
          <Text style={styles.starIcon}>{isStarred ? "⭐" : "☆"}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Drawer content
  const renderDrawer = () => (
    <Modal visible={drawerOpen} transparent animationType="none">
      <View style={styles.drawerOverlay}>
        <TouchableOpacity
          style={styles.drawerBackdrop}
          onPress={() => setDrawerOpen(false)}
          activeOpacity={1}
        />
        <View style={styles.drawer}>
          {/* Gmail Logo Header */}
          <View style={styles.drawerHeader}>
            <Text style={styles.gmailLogo}>📧 Gmail</Text>
          </View>

          <ScrollView style={styles.drawerScroll}>
            {/* Folders */}
            {FOLDERS.map((folder) => (
              <TouchableOpacity
                key={folder.id}
                style={[
                  styles.drawerItem,
                  selectedLabel === folder.id && styles.drawerItemActive,
                ]}
                onPress={() => {
                  setSelectedLabel(folder.id);
                  setDrawerOpen(false);
                }}
              >
                <Text style={styles.drawerItemIcon}>{folder.icon}</Text>
                <Text
                  style={[
                    styles.drawerItemText,
                    selectedLabel === folder.id && styles.drawerItemTextActive,
                  ]}
                >
                  {folder.name}
                </Text>
                {folder.count !== undefined && folder.count > 0 && (
                  <Text style={styles.drawerItemCount}>{folder.count}</Text>
                )}
              </TouchableOpacity>
            ))}

            <View style={styles.drawerDivider} />

            {/* Categories */}
            <Text style={styles.drawerSectionTitle}>CATEGORIES</Text>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.drawerItem,
                  selectedLabel === cat.id && styles.drawerItemActive,
                ]}
                onPress={() => {
                  setSelectedLabel(cat.id);
                  setDrawerOpen(false);
                }}
              >
                <Text style={styles.drawerItemIcon}>{cat.icon}</Text>
                <Text
                  style={[
                    styles.drawerItemText,
                    selectedLabel === cat.id && styles.drawerItemTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.drawerDivider} />

            {/* Accounts */}
            <Text style={styles.drawerSectionTitle}>ACCOUNTS</Text>
            {accounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={[
                  styles.accountItem,
                  selectedAccount === account.email && styles.accountItemActive,
                ]}
                onPress={() => {
                  setSelectedAccount(account.email);
                  setDrawerOpen(false);
                }}
              >
                <View
                  style={[
                    styles.accountAvatar,
                    { backgroundColor: getAvatarColor(account.email) },
                  ]}
                >
                  <Text style={styles.accountAvatarText}>
                    {getInitials(account.name)}
                  </Text>
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{account.name}</Text>
                  <Text style={styles.accountEmail}>{account.email}</Text>
                </View>
                {account.unreadCount !== undefined &&
                  account.unreadCount > 0 && (
                    <Text style={styles.accountCount}>
                      {account.unreadCount}
                    </Text>
                  )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Main UI
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Search Bar / Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setDrawerOpen(true)}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => setShowSearch(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>Search in mail</Text>
        </TouchableOpacity>

        {/* Swipeable Avatar - swipe up/down to switch accounts */}
        <View
          {...avatarPanResponder.panHandlers}
          style={[
            styles.headerAvatar,
            {
              backgroundColor: getAvatarColor(
                currentAccountInfo?.email || selectedAccount || "Admin"
              ),
            },
          ]}
        >
          <Text style={styles.headerAvatarText}>
            {getInitials(
              currentAccountInfo?.name ||
                currentAccountInfo?.email ||
                selectedAccount?.split("@")[0] ||
                "A"
            )}
          </Text>
        </View>
      </View>

      {/* Loading */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <>
          {/* Email List */}
          <FlatList
            data={emails}
            keyExtractor={(item, index) =>
              item._id || item.id || item.messageId || String(index)
            }
            renderItem={renderEmail}
            contentContainerStyle={styles.emailList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>No emails</Text>
                <Text style={styles.emptySubtext}>
                  {selectedAccount
                    ? `in ${selectedLabel}`
                    : "Select an account"}
                </Text>
              </View>
            }
          />
        </>
      )}

      {/* Compose FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowCompose(true)}>
        <Text style={styles.fabIcon}>✏️</Text>
        <Text style={styles.fabText}>Compose</Text>
      </TouchableOpacity>

      {/* Drawer */}
      {renderDrawer()}

      {/* Compose Modal */}
      <Modal visible={showCompose} animationType="slide">
        <SafeAreaView style={styles.composeContainer}>
          <View style={styles.composeHeader}>
            <TouchableOpacity onPress={() => setShowCompose(false)}>
              <Text style={styles.composeClose}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.composeTitle}>Compose</Text>
            <TouchableOpacity onPress={handleSend} disabled={sending}>
              {sending ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text style={styles.composeSend}>📤</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.composeForm}>
            <View style={styles.composeField}>
              <Text style={styles.composeLabel}>From</Text>
              <Text style={styles.composeFrom}>
                {selectedAccount || "Select account"}
              </Text>
            </View>
            <View style={styles.composeField}>
              <Text style={styles.composeLabel}>To</Text>
              <TextInput
                style={styles.composeInput}
                value={composeTo}
                onChangeText={setComposeTo}
                placeholder="Recipients"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.composeField}>
              <Text style={styles.composeLabel}>Subject</Text>
              <TextInput
                style={styles.composeInput}
                value={composeSubject}
                onChangeText={setComposeSubject}
                placeholder="Subject"
                placeholderTextColor="#999"
              />
            </View>
            <TextInput
              style={styles.composeBody}
              value={composeBody}
              onChangeText={setComposeBody}
              placeholder="Compose email"
              placeholderTextColor="#999"
              multiline
              textAlignVertical="top"
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Email Detail Modal - Gmail Style */}
      <Modal visible={!!selectedEmail} animationType="slide">
        <SafeAreaView style={styles.detailContainer}>
          {/* Header with action icons */}
          <View style={styles.detailHeader}>
            <TouchableOpacity
              style={styles.detailBackBtn}
              onPress={() => {
                setSelectedEmail(null);
                setFullEmailContent(null);
                setShowEmailDetails(false);
              }}
            >
              <Text style={styles.detailBackIcon}>←</Text>
            </TouchableOpacity>
            <View style={styles.detailHeaderActions}>
              <TouchableOpacity style={styles.detailHeaderAction}>
                <Text style={styles.detailActionIcon}>🗑️</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.detailHeaderAction}>
                <Text style={styles.detailActionIcon}>📧</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.detailHeaderAction}>
                <Text style={styles.detailActionIcon}>⋮</Text>
              </TouchableOpacity>
            </View>
          </View>

          {selectedEmail && (
            <ScrollView
              style={styles.detailScrollView}
              contentContainerStyle={styles.detailScrollContent}
            >
              {/* Subject */}
              <Text style={styles.detailSubject}>
                {(fullEmailContent || selectedEmail).subject || "(No Subject)"}
              </Text>

              {/* Sender Row - Gmail Style */}
              <View style={styles.detailSenderContainer}>
                <View
                  style={[
                    styles.detailSenderAvatar,
                    {
                      backgroundColor: getAvatarColor(
                        formatEmailAddress(
                          (fullEmailContent || selectedEmail).from
                        )
                      ),
                    },
                  ]}
                >
                  <Text style={styles.detailSenderAvatarText}>
                    {getInitials(
                      formatEmailAddress(
                        (fullEmailContent || selectedEmail).from
                      )
                    )}
                  </Text>
                </View>
                <View style={styles.detailSenderDetails}>
                  <View style={styles.detailSenderNameRow}>
                    <Text style={styles.detailSenderName}>
                      {formatEmailAddress(
                        (fullEmailContent || selectedEmail).from
                      )}
                    </Text>
                    <Text style={styles.detailDateText}>
                      {formatDate(
                        (fullEmailContent || selectedEmail).receivedAt ||
                          (fullEmailContent || selectedEmail).date ||
                          ((fullEmailContent || selectedEmail).internalDate
                            ? new Date(
                                (
                                  fullEmailContent || selectedEmail
                                ).internalDate!
                              ).toISOString()
                            : undefined)
                      )}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.detailToRow}
                    onPress={() => setShowEmailDetails(!showEmailDetails)}
                  >
                    <Text style={styles.detailToText}>
                      to{" "}
                      {formatEmailAddress(
                        (fullEmailContent || selectedEmail).to
                      )}
                    </Text>
                    <Text
                      style={[
                        styles.detailToDropdown,
                        showEmailDetails && styles.detailToDropdownOpen,
                      ]}
                    >
                      ▼
                    </Text>
                  </TouchableOpacity>

                  {/* Expandable Email Details */}
                  {showEmailDetails && (
                    <View style={styles.emailDetailsExpanded}>
                      <View style={styles.emailDetailRow}>
                        <Text style={styles.emailDetailLabel}>From:</Text>
                        <Text style={styles.emailDetailValue}>
                          {formatEmailAddress(
                            (fullEmailContent || selectedEmail).from
                          )}
                        </Text>
                      </View>
                      <View style={styles.emailDetailRow}>
                        <Text style={styles.emailDetailLabel}>To:</Text>
                        <Text style={styles.emailDetailValue}>
                          {formatEmailAddress(
                            (fullEmailContent || selectedEmail).to
                          )}
                        </Text>
                      </View>
                      {(fullEmailContent || selectedEmail).cc && (
                        <View style={styles.emailDetailRow}>
                          <Text style={styles.emailDetailLabel}>Cc:</Text>
                          <Text style={styles.emailDetailValue}>
                            {formatEmailAddress(
                              (fullEmailContent || selectedEmail).cc
                            )}
                          </Text>
                        </View>
                      )}
                      {(fullEmailContent || selectedEmail).bcc && (
                        <View style={styles.emailDetailRow}>
                          <Text style={styles.emailDetailLabel}>Bcc:</Text>
                          <Text style={styles.emailDetailValue}>
                            {formatEmailAddress(
                              (fullEmailContent || selectedEmail).bcc
                            )}
                          </Text>
                        </View>
                      )}
                      <View style={styles.emailDetailRow}>
                        <Text style={styles.emailDetailLabel}>Date:</Text>
                        <Text style={styles.emailDetailValue}>
                          {(() => {
                            const dateStr =
                              (fullEmailContent || selectedEmail).receivedAt ||
                              (fullEmailContent || selectedEmail).date ||
                              ((fullEmailContent || selectedEmail).internalDate
                                ? new Date(
                                    (
                                      fullEmailContent || selectedEmail
                                    ).internalDate!
                                  ).toISOString()
                                : undefined);
                            if (!dateStr) return "Unknown";
                            const date = new Date(dateStr);
                            if (isNaN(date.getTime())) return "Unknown";
                            return date.toLocaleDateString([], {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                          })()}
                        </Text>
                      </View>
                      <View style={styles.emailDetailRow}>
                        <Text style={styles.emailDetailLabel}>Subject:</Text>
                        <Text style={styles.emailDetailValue}>
                          {(fullEmailContent || selectedEmail).subject ||
                            "(No Subject)"}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Loading indicator */}
              {loadingDetail && (
                <View style={styles.detailLoadingRow}>
                  <ActivityIndicator size="small" color="#1a73e8" />
                  <Text style={styles.detailLoadingLabel}>Loading...</Text>
                </View>
              )}

              {/* Email Body - Gmail Style */}
              <View style={styles.detailBodySection}>
                <Text style={styles.detailBodyContent}>
                  {(fullEmailContent || selectedEmail).textBody ||
                    (fullEmailContent || selectedEmail).body ||
                    (fullEmailContent || selectedEmail).text ||
                    (fullEmailContent || selectedEmail).htmlBody?.replace(
                      /<[^>]*>/g,
                      ""
                    ) ||
                    (fullEmailContent || selectedEmail).html?.replace(
                      /<[^>]*>/g,
                      ""
                    ) ||
                    (fullEmailContent || selectedEmail).snippet ||
                    "(No content)"}
                </Text>
              </View>

              {/* Attachments - Gmail Style */}
              {(fullEmailContent?.attachments?.length || 0) > 0 && (
                <View style={styles.detailAttachments}>
                  <Text style={styles.detailAttachmentsLabel}>
                    {fullEmailContent?.attachments?.length} Attachments
                  </Text>
                  <View style={styles.detailAttachmentsList}>
                    {fullEmailContent?.attachments?.map((att, index) => (
                      <TouchableOpacity
                        key={att.attachmentId || att.id || `att-${index}`}
                        style={styles.detailAttachmentItem}
                      >
                        <View style={styles.detailAttachmentIconBox}>
                          <Text style={styles.detailAttachmentIcon}>📄</Text>
                        </View>
                        <View style={styles.detailAttachmentInfo}>
                          <Text
                            style={styles.detailAttachmentName}
                            numberOfLines={1}
                          >
                            {att.filename}
                          </Text>
                          <Text style={styles.detailAttachmentSize}>
                            {formatFileSize(att.size || 0)}
                          </Text>
                        </View>
                        <Text style={styles.detailDownloadIcon}>⬇️</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          {/* Reply FAB - Gmail Blue Style */}
          <TouchableOpacity style={styles.gmailReplyFab}>
            <Text style={styles.gmailReplyIcon}>↩️</Text>
            <Text style={styles.gmailReplyText}>Reply</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  menuButton: {
    padding: 12,
  },
  menuIcon: {
    fontSize: 22,
    color: "#5f6368",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f3f4",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 8,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchPlaceholder: {
    color: "#5f6368",
    fontSize: 16,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  headerAvatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Email list
  emailList: {
    paddingBottom: 80,
  },
  emailItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
  },
  emailItemUnread: {
    backgroundColor: "#f5f8ff",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emailContent: {
    flex: 1,
  },
  emailTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  emailSender: {
    flex: 1,
    fontSize: 14,
    color: "#3c4043",
    marginRight: 8,
  },
  emailSenderUnread: {
    fontWeight: "700",
    color: "#202124",
  },
  emailDate: {
    fontSize: 12,
    color: "#5f6368",
  },
  emailSubject: {
    fontSize: 13,
    color: "#3c4043",
    marginBottom: 2,
  },
  emailSubjectUnread: {
    fontWeight: "600",
    color: "#202124",
  },
  emailBottomRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  emailSnippet: {
    flex: 1,
    fontSize: 13,
    color: "#5f6368",
  },
  attachmentIcon: {
    fontSize: 14,
    marginLeft: 6,
  },
  starButton: {
    padding: 8,
  },
  starIcon: {
    fontSize: 18,
    color: "#5f6368",
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: "#3c4043",
    fontWeight: "500",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#5f6368",
    marginTop: 4,
  },

  // FAB
  fab: {
    position: "absolute",
    bottom: 24,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  fabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3c4043",
  },

  // Drawer
  drawerOverlay: {
    flex: 1,
    flexDirection: "row",
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: "#fff",
  },
  drawerHeader: {
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
  },
  gmailLogo: {
    fontSize: 22,
    fontWeight: "600",
    color: "#c5221f",
  },
  drawerScroll: {
    flex: 1,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 8,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
  },
  drawerItemActive: {
    backgroundColor: "#fce8e6",
  },
  drawerItemIcon: {
    fontSize: 18,
    marginRight: 16,
  },
  drawerItemText: {
    flex: 1,
    fontSize: 14,
    color: "#202124",
    fontWeight: "500",
  },
  drawerItemTextActive: {
    color: "#c5221f",
    fontWeight: "700",
  },
  drawerItemCount: {
    fontSize: 12,
    color: "#5f6368",
    fontWeight: "600",
  },
  drawerDivider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 12,
  },
  drawerSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5f6368",
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  accountItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginRight: 8,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
  },
  accountItemActive: {
    backgroundColor: "#e8f0fe",
  },
  accountAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  accountAvatarText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#202124",
  },
  accountEmail: {
    fontSize: 12,
    color: "#5f6368",
  },
  accountCount: {
    fontSize: 12,
    color: "#1a73e8",
    fontWeight: "600",
  },

  // Compose
  composeContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  composeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
  },
  composeClose: {
    fontSize: 20,
    color: "#5f6368",
  },
  composeTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#202124",
  },
  composeSend: {
    fontSize: 22,
  },
  composeForm: {
    flex: 1,
    padding: 16,
  },
  composeField: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
    paddingVertical: 12,
  },
  composeLabel: {
    width: 60,
    fontSize: 14,
    color: "#5f6368",
  },
  composeFrom: {
    flex: 1,
    fontSize: 14,
    color: "#202124",
  },
  composeInput: {
    flex: 1,
    fontSize: 14,
    color: "#202124",
    padding: 0,
  },
  composeBody: {
    flex: 1,
    fontSize: 16,
    color: "#202124",
    marginTop: 16,
    textAlignVertical: "top",
  },

  // Email Detail
  detailContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
  },
  detailBack: {
    fontSize: 24,
    color: "#5f6368",
    paddingHorizontal: 8,
  },
  detailActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailAction: {
    padding: 10,
  },
  detailContent: {
    flex: 1,
    padding: 16,
  },
  detailSubject: {
    fontSize: 22,
    fontWeight: "400",
    color: "#202124",
    marginBottom: 16,
    lineHeight: 30,
  },
  detailSenderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  detailAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailAvatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  detailSenderInfo: {
    flex: 1,
  },
  detailSenderName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#202124",
  },
  detailTo: {
    fontSize: 12,
    color: "#5f6368",
    marginTop: 2,
  },
  detailDate: {
    fontSize: 12,
    color: "#5f6368",
  },
  detailLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  detailLoadingText: {
    marginLeft: 8,
    color: "#5f6368",
  },
  attachmentsSection: {
    marginBottom: 20,
  },
  attachmentsTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#202124",
    marginBottom: 12,
  },
  attachmentCard: {
    width: 120,
    backgroundColor: "#f1f3f4",
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
    alignItems: "center",
  },
  attachmentCardIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  attachmentCardName: {
    fontSize: 12,
    color: "#202124",
    textAlign: "center",
  },
  attachmentCardSize: {
    fontSize: 10,
    color: "#5f6368",
    marginTop: 4,
  },
  detailBody: {
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: "#e0e0e0",
  },
  detailBodyText: {
    fontSize: 15,
    color: "#202124",
    lineHeight: 24,
  },
  replyFab: {
    position: "absolute",
    bottom: 24,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a73e8",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  replyFabIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  replyFabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  // Gmail Detail View Styles
  detailBackBtn: {
    padding: 8,
  },
  detailBackIcon: {
    fontSize: 24,
    color: "#5f6368",
  },
  detailHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailHeaderAction: {
    padding: 12,
  },
  detailActionIcon: {
    fontSize: 20,
  },
  detailScrollView: {
    flex: 1,
  },
  detailScrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  detailSenderContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 16,
    marginBottom: 24,
  },
  detailSenderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailSenderAvatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  detailSenderDetails: {
    flex: 1,
  },
  detailSenderNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailDateText: {
    fontSize: 12,
    color: "#5f6368",
  },
  detailToRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  detailToText: {
    fontSize: 13,
    color: "#5f6368",
  },
  detailToDropdown: {
    fontSize: 8,
    color: "#5f6368",
    marginLeft: 4,
  },
  detailLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  detailLoadingLabel: {
    marginLeft: 8,
    color: "#5f6368",
  },
  detailBodySection: {
    marginTop: 0,
  },
  detailBodyContent: {
    fontSize: 15,
    color: "#202124",
    lineHeight: 26,
  },
  detailAttachments: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 16,
  },
  detailAttachmentsLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#5f6368",
    marginBottom: 12,
  },
  detailAttachmentsList: {
    gap: 8,
  },
  detailAttachmentItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f3f4",
    borderRadius: 8,
    padding: 12,
  },
  detailAttachmentIconBox: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailAttachmentIcon: {
    fontSize: 20,
  },
  detailAttachmentInfo: {
    flex: 1,
  },
  detailAttachmentName: {
    fontSize: 14,
    color: "#202124",
    fontWeight: "500",
  },
  detailAttachmentSize: {
    fontSize: 12,
    color: "#5f6368",
    marginTop: 2,
  },
  detailDownloadIcon: {
    fontSize: 18,
    marginLeft: 8,
  },
  gmailReplyFab: {
    position: "absolute",
    bottom: 24,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a73e8",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
    elevation: 6,
    shadowColor: "#1a73e8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  gmailReplyIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  gmailReplyText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  // Expandable Email Details Styles
  detailToDropdownOpen: {
    transform: [{ rotate: "180deg" }],
  },
  emailDetailsExpanded: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  emailDetailRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  emailDetailLabel: {
    width: 60,
    fontSize: 13,
    color: "#5f6368",
    fontWeight: "500",
  },
  emailDetailValue: {
    flex: 1,
    fontSize: 13,
    color: "#202124",
  },
});
