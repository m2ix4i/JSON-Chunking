/**
 * Global notification system with toast-like notifications.
 */

import React from 'react';
import {
  Box,
  Snackbar,
  Alert,
  AlertTitle,
  Slide,
  Button,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';
import { useNotifications } from '@stores/appStore';
import { useAppStore } from '@stores/appStore';

interface SlideTransitionProps extends TransitionProps {
  children: React.ReactElement<any, any>;
}

const SlideTransition = React.forwardRef<unknown, SlideTransitionProps>(
  function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
  }
);

const NotificationProvider: React.FC = () => {
  const notifications = useNotifications();
  const removeNotification = useAppStore(state => state.removeNotification);

  const handleClose = (notificationId: string) => (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === 'clickaway') {
      return;
    }
    removeNotification(notificationId);
  };

  return (
    <Box>
      {notifications.map((notification, index) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={notification.persistent ? null : notification.duration}
          onClose={handleClose(notification.id)}
          TransitionComponent={SlideTransition}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{
            mt: index * 7, // Stack notifications
            zIndex: 1400 + index, // Ensure proper stacking
          }}
        >
          <Alert
            onClose={handleClose(notification.id)}
            severity={notification.type}
            variant="filled"
            sx={{
              minWidth: 300,
              maxWidth: 500,
              '& .MuiAlert-message': {
                width: '100%',
              },
            }}
            action={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {notification.actions?.map((action, actionIndex) => (
                  <Button
                    key={actionIndex}
                    color="inherit"
                    size="small"
                    onClick={() => {
                      action.action();
                      removeNotification(notification.id);
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
                <IconButton
                  size="small"
                  color="inherit"
                  onClick={handleClose(notification.id)}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            }
          >
            {notification.title && (
              <AlertTitle>{notification.title}</AlertTitle>
            )}
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </Box>
  );
};

export default NotificationProvider;