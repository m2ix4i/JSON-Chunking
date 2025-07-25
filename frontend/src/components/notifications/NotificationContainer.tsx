/**
 * Notification container component for displaying app-wide notifications.
 */

import React from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Slide,
  SlideProps,
} from '@mui/material';
import { useNotifications, useAppStore } from '@stores/appStore';

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="left" />;
}

const NotificationContainer: React.FC = () => {
  const notifications = useNotifications();
  const removeNotification = useAppStore((state) => state.removeNotification);

  const handleClose = (id: string) => {
    removeNotification(id);
  };

  return (
    <>
      {notifications.map((notification, index) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={notification.autoHide ? notification.duration : null}
          onClose={() => handleClose(notification.id)}
          TransitionComponent={SlideTransition}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{
            // Stack notifications by adjusting bottom position
            bottom: `${(index * 80) + 24}px !important`,
          }}
        >
          <Alert
            onClose={() => handleClose(notification.id)}
            severity={notification.type}
            variant="filled"
            sx={{
              minWidth: 320,
              maxWidth: 500,
            }}
          >
            <AlertTitle sx={{ fontWeight: 600 }}>
              {notification.title}
            </AlertTitle>
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
};

export default NotificationContainer;