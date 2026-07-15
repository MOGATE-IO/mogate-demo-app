import type { ReactNode } from 'react';
import { Button, Typography } from 'heroui-native';
import { ArrowLeft } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  backLabel?: string;
  right?: ReactNode;
  onBack?: () => void;
};

export function PageHeader({
  backLabel = 'Back',
  onBack,
  right,
  subtitle,
  title
}: PageHeaderProps) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Button
          accessibilityLabel={backLabel}
          className="h-11 w-11 rounded-lg px-0"
          onPress={onBack}
          variant="secondary"
        >
          <ArrowLeft color="#18181b" size={20} strokeWidth={2.25} />
        </Button>
      ) : null}
      <View style={styles.copy}>
        <Typography.Heading numberOfLines={1} type="h4">{title}</Typography.Heading>
        {subtitle ? (
          <Typography color="muted" numberOfLines={1} type="body-xs">{subtitle}</Typography>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
    paddingTop: 2
  },
  copy: {
    flex: 1,
    minWidth: 0
  },
  right: {
    alignItems: 'flex-end',
    justifyContent: 'center'
  }
});
