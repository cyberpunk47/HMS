import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';
const successNotification = (message: string) => {
    notifications.show({
        title: "Success",
        message: message,
        color: 'teal',
        icon: <IconCheck />,
        withCloseButton: true,
        withBorder: true,
        className: '!border-primary-500',
    });
                    
}
const errorNotification = (message: string) => {
    notifications.show({
        title: "Error",
        message: message,
        color: '#ab0000',
        icon: <IconX />,
        withCloseButton: true,
        withBorder: true,
        className: '!border-red-700',
    });
}

export { successNotification, errorNotification };