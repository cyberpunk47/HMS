import { useState } from 'react';
import {
  Popover,
  ActionIcon,
  Indicator,
  ScrollArea,
  Text,
  Group,
  Stack,
  Divider,
  Box,
  Loader,
  Center,
  Badge,
} from '@mantine/core';
import { IconBell, IconCalendar, IconCalendarOff, IconCalendarEvent, IconCheck, IconClock } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { getPatientNotification, getDoctorNotification } from '../Service/NotificationService';
import { formatDateWithtimeUtil, parseDateAsUTC } from '@/Utility/DateUtility';

// Matches the backend NotificationDTO exactly
export interface NotificationDTO {
  id: number;
  eventId: string;
  appointmentId: number;
  recipientId: number;
  recipientRole: string;
  recipientEmail: string;
  recipientPhone: string;
  title: string;
  message: string;
  status: 'SENT' | 'PENDING' | 'FAILED' | 'DELIVERED';
  createdAt: string;
  sentAt: string;
}

// Icon and color mapping based on notification title
const getNotificationIcon = (title: string) => {
  const lower = title.toLowerCase();
  if (lower.includes('cancelled')) return { icon: IconCalendarOff, color: 'red' };
  if (lower.includes('rescheduled')) return { icon: IconCalendarEvent, color: 'orange' };
  if (lower.includes('completed')) return { icon: IconCheck, color: 'green' };
  if (lower.includes('expired')) return { icon: IconClock, color: 'gray' };
  return { icon: IconCalendar, color: 'teal' };
};

// Relative time formatting (short)
const getRelativeTime = (dateStr: string) => {
    if (!dateStr) return '';

    const date = parseDateAsUTC(dateStr);

    if (!date) return '';

    const now = new Date();

    const diffMs = now.getTime() - date.getTime();

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

const formatNotificationDate = (dateStr: string) => {
    if (!dateStr) return '';

    const date = parseDateAsUTC(dateStr);

    if (!date) return '';

    return date.toLocaleString('en-US', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};
const formatMessageWithDate = (message: string) => {
  if (!message) return message;

  // Regex to capture an ISO-like timestamp
  const isoRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?/g;

  return message.replace(isoRegex, (match : any) => {
    try {
      return formatDateWithtimeUtil(match); // uses your existing formatter
    } catch {
      return match;
    }
  });
};

export function NotificationBell() {
  const [opened, setOpened] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const user = useSelector((state: any) => state.user);

  const userId = user?.profileId ?? user?.id;
  const userRole = user?.role; // "PATIENT", "DOCTOR", or "ADMIN"

  // Only fetch for PATIENT or DOCTOR roles (ADMIN doesn't have notifications from this service)
  const isEligible = userRole === 'PATIENT' || userRole === 'DOCTOR';

  const { data: notifications = [], isLoading, isError } = useQuery<NotificationDTO[]>({
    queryKey: ['notifications', userId, userRole],
    queryFn: () =>
      userRole === 'PATIENT'
        ? getPatientNotification(userId)
        : getDoctorNotification(userId),
    enabled: !!userId && isEligible,
    refetchInterval: 60000, // Poll every 60 seconds
    staleTime: 30000,
  });

  const notificationCount = notifications.length;

  // Don't render the bell for ADMIN or unauthenticated users
  if (!userId || !isEligible) return null;

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-end"
      withArrow
      shadow="lg"
      offset={8}
      radius="md"
    >
      <Popover.Target>
        <Indicator
          inline
          label={notificationCount > 99 ? '99+' : notificationCount}
          size={18}
          disabled={notificationCount === 0}
          color="red"
          offset={6}
        >
          <ActionIcon
            variant="subtle"
            size="lg"
            onClick={() => setOpened((o) => !o)}
            aria-label="Notifications"
            color="gray"
          >
            <IconBell size={20} stroke={1.5} />
          </ActionIcon>
        </Indicator>
      </Popover.Target>

      <Popover.Dropdown p={0} style={{ width: 380 }}>
        {/* Header */}
        <Group justify="space-between" px="md" py="sm">
          <Text fw={600} size="sm">Notifications</Text>
          {notificationCount > 0 && (
            <Badge variant="light" color="teal" size="sm">
              {notificationCount} new
            </Badge>
          )}
        </Group>

        <Divider />

        {/* Notifications List */}
        <ScrollArea h={380} type="hover" scrollbarSize={6}>
          {isLoading && (
            <Center p="xl">
              <Loader size="sm" color="teal" />
            </Center>
          )}

          {isError && (
            <Center p="xl">
              <Stack align="center" gap="xs">
                <IconBell size={32} color="var(--mantine-color-red-4)" stroke={1.5} />
                <Text c="red" size="sm" ta="center">
                  Failed to load notifications
                </Text>
              </Stack>
            </Center>
          )}

          {!isLoading && !isError && notifications.length === 0 && (
            <Center p="xl" py={60}>
              <Stack align="center" gap="xs">
                <IconBell size={40} color="var(--mantine-color-gray-4)" stroke={1.2} />
                <Text c="dimmed" size="sm">No notifications yet</Text>
              </Stack>
            </Center>
          )}

          {!isLoading &&
            !isError &&
            notifications.map((notification) => {

              const { icon: Icon, color } = getNotificationIcon(notification.title);
              const isExpanded = expandedId === notification.id;
              return (
                <Box
                  key={notification.id}
                  px="md"
                  py="sm"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : notification.id)
                  }
                  style={{
                    borderBottom: '1px solid var(--mantine-color-gray-1)',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      'var(--mantine-color-gray-0)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      'transparent';
                  }}
                >
                  <Group wrap="nowrap" align="flex-start" gap="sm">
                    <Box
                      mt={2}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        backgroundColor: `var(--mantine-color-${color}-0)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={18} stroke={1.5} color={`var(--mantine-color-${color}-6)`} />
                    </Box>
                    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                      <Group justify="space-between" wrap="nowrap">
                        <Text size="sm" fw={600} lineClamp={1} style={{ flex: 1 }}>
                          {notification.title}
                        </Text>
                        <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                          {getRelativeTime(notification.createdAt)}
                        </Text>
                      </Group>
                      <Text
                        size="xs"
                        c="dimmed"
                        lineClamp={isExpanded ? undefined : 2}
                      >
                        {formatMessageWithDate(notification.message)}
                      </Text>
                      {isExpanded && (
                        <Stack gap={4} mt="xs">
                          <Text size="xs" c="dimmed">
                            {formatNotificationDate(notification.createdAt)}
                          </Text>
                          {notification.appointmentId && (
                            <Text size="xs" fw={500}>
                              Appointment #{notification.appointmentId}
                            </Text>
                          )}
                        </Stack>
                      )}
                    </Stack>
                  </Group>
                </Box>
              );
            })}
        </ScrollArea>
      </Popover.Dropdown>
    </Popover>
  );
}