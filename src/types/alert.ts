export type AlertButtonStyle = 'default' | 'cancel' | 'destructive';

export type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: AlertButtonStyle;
};

export type AlertPayload = {
  title: string;
  message?: string;
  buttons: AlertButton[];
};
