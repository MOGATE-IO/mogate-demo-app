import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import type { WalletStatus } from '@/@web3/types/wallet';

export type OnboardingPanelProps = {
  walletStatus: WalletStatus;
  walletReady: boolean;
  loading: boolean;
  step: number;
  totalSteps: number;
  error?: string | null;
  onNext: () => void;
  onConnect: () => void;
};

const SLIDES = [
  {
    title: 'Collect giftcards without the wallet mess',
    body: 'Buy, hold, send, and redeem funded giftcards from one simple account.'
  },
  {
    title: 'Use your balance anywhere',
    body: 'Your supported USDC, ETH, and SOL balances can work together behind the scenes.'
  },
  {
    title: 'Start with Google',
    body: 'We create or restore your secure embedded wallet after login.'
  }
] as const;

export function OnboardingPanel({
  error,
  loading,
  onNext,
  onConnect,
  step,
  totalSteps,
  walletReady,
  walletStatus
}: OnboardingPanelProps) {
  const slide = SLIDES[step] ?? SLIDES[SLIDES.length - 1];
  const finalStep = step >= totalSteps - 1;

  return (
    <View style={styles.shell}>
      <View style={styles.progressTrack}>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <View key={index} style={[styles.progressSegment, index <= step && styles.progressActive]} />
        ))}
      </View>

      <View style={styles.gallery}>
        <View style={styles.backCard} />
        <View style={styles.middleCard} />
        <View style={styles.artCard}>
          <Text style={styles.artText}>MG</Text>
          <Text style={styles.artCaption}>Giftcard</Text>
        </View>
      </View>

      <View style={styles.copyBlock}>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>
      </View>

      {finalStep ? (
        <Button
          disabled={!walletReady}
          loading={loading || walletStatus === 'connecting'}
          onPress={onConnect}
          variant="primary"
        >
          Continue with Google
        </Button>
      ) : (
        <Button onPress={onNext} variant="primary">
          Next
        </Button>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    gap: 28,
    minHeight: 620,
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 22
  },
  progressTrack: {
    flexDirection: 'row',
    gap: 6
  },
  progressSegment: {
    backgroundColor: '#d9d4cc',
    borderRadius: 99,
    flex: 1,
    height: 3
  },
  progressActive: {
    backgroundColor: '#171512'
  },
  gallery: {
    alignItems: 'center',
    height: 270,
    justifyContent: 'center'
  },
  backCard: {
    backgroundColor: '#d4e6ff',
    borderRadius: 22,
    height: 190,
    position: 'absolute',
    transform: [{ translateX: -36 }, { rotate: '-9deg' }],
    width: 146
  },
  middleCard: {
    backgroundColor: '#c7c0ff',
    borderRadius: 22,
    height: 208,
    position: 'absolute',
    transform: [{ translateX: 34 }, { rotate: '8deg' }],
    width: 156
  },
  artCard: {
    alignItems: 'center',
    backgroundColor: '#171512',
    borderRadius: 24,
    height: 228,
    justifyContent: 'center',
    shadowColor: '#171512',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    width: 164
  },
  artText: {
    color: '#ffffff',
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: 0
  },
  artCaption: {
    color: '#d6c5ad',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8
  },
  copyBlock: {
    gap: 10
  },
  title: {
    color: '#171512',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 36,
    textAlign: 'center'
  },
  body: {
    color: '#6f6860',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center'
  },
  error: {
    backgroundColor: '#fff0ee',
    borderColor: '#f1b5ad',
    borderRadius: 8,
    borderWidth: 1,
    color: '#a3372d',
    fontSize: 13,
    lineHeight: 18,
    padding: 10
  }
});
