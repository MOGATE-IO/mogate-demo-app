import type { PropsWithChildren, ReactNode } from 'react';
import { Card as HeroCard, Typography } from 'heroui-native';
import { StyleSheet, View } from 'react-native';

type CardProps = PropsWithChildren<{
  title?: string;
  eyebrow?: string;
  right?: ReactNode;
}>;

export function Card({ children, eyebrow, right, title }: CardProps) {
  return (
    <HeroCard className="gap-3 rounded-lg border border-border bg-surface p-4 shadow-none">
      {(title || eyebrow || right) && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {eyebrow ? (
              <Typography color="muted" type="body-xs" weight="semibold">
                {eyebrow}
              </Typography>
            ) : null}
            {title ? (
              <HeroCard.Title className="text-lg font-semibold">{title}</HeroCard.Title>
            ) : null}
          </View>
          {right}
        </View>
      )}
      {children}
    </HeroCard>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between'
  },
  headerText: {
    flex: 1,
    gap: 3
  }
});
