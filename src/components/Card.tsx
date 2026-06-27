import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type CardProps = PropsWithChildren<{
  title?: string;
  eyebrow?: string;
  right?: ReactNode;
}>;

export function Card({ children, eyebrow, right, title }: CardProps) {
  return (
    <View style={styles.card}>
      {(title || eyebrow || right) && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            {title ? <Text style={styles.title}>{title}</Text> : null}
          </View>
          {right}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e3ddd3',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between'
  },
  headerText: {
    flex: 1,
    gap: 3
  },
  eyebrow: {
    color: '#8b7461',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase'
  },
  title: {
    color: '#171512',
    fontSize: 17,
    fontWeight: '800'
  }
});
