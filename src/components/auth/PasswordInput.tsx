import React, { useState } from 'react';
import {
  Pressable,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Eye, EyeOff, Lock } from 'lucide-react-native';
import { authFormStyles as styles } from './AuthScreenShell';
import { BRAND_HEADER_BG, TEXT_MUTED } from '../../theme/brandColors';

type Props = Omit<TextInputProps, 'secureTextEntry' | 'style'> & {
  placeholder?: string;
};

/** Password field with lock icon and show/hide toggle. */
export function PasswordInput({
  placeholder = 'Enter your password',
  placeholderTextColor = '#94a3b8',
  returnKeyType = 'done',
  autoComplete = 'password',
  textContentType = 'password',
  ...rest
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.inputRow}>
      <View style={styles.inputIconSlot}>
        <Lock size={18} color={TEXT_MUTED} strokeWidth={2} />
      </View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        value={rest.value}
        onChangeText={rest.onChangeText}
        secureTextEntry={!visible}
        autoComplete={autoComplete}
        textContentType={textContentType}
        returnKeyType={returnKeyType}
        onSubmitEditing={rest.onSubmitEditing}
        editable={rest.editable}
      />
      <Pressable
        style={styles.passwordToggle}
        onPress={() => setVisible(v => !v)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        accessibilityState={{ selected: visible }}>
        {visible ? (
          <EyeOff size={20} color={TEXT_MUTED} strokeWidth={2} />
        ) : (
          <Eye size={20} color={BRAND_HEADER_BG} strokeWidth={2} />
        )}
      </Pressable>
    </View>
  );
}
