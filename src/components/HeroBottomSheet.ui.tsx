import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { BottomSheetFooter, type BottomSheetFooterProps } from '@gorhom/bottom-sheet';
import { BottomSheet, Button } from 'heroui-native';
import { Maximize2, Minimize2 } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function HeroBottomSheet({
  children,
  description,
  footer,
  headerLeading,
  onClose,
  size = 'large',
  title,
  visible
}: {
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  headerLeading?: ReactNode;
  onClose: () => void;
  size?: 'compact' | 'large';
  title: string;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(
    () => size === 'compact' ? ['54%', '88%'] : ['76%', '96%'],
    [size]
  );
  const sheetRef = useRef<ComponentRef<typeof BottomSheet.Content>>(null);
  const onCloseRef = useRef(onClose);
  const visibleRef = useRef(visible);
  const [snapIndex, setSnapIndex] = useState(0);

  // Gorhom may emit its close event after a controlled visibility change. Read
  // current props so that event cannot close the parent with a stale render.
  onCloseRef.current = onClose;
  visibleRef.current = visible;

  useEffect(() => {
    if (visible) setSnapIndex(0);
  }, [visible]);

  const toggleExpanded = useCallback(() => {
    const nextIndex = snapIndex === snapPoints.length - 1 ? 0 : snapPoints.length - 1;
    sheetRef.current?.snapToIndex(nextIndex);
    setSnapIndex(nextIndex);
  }, [snapIndex, snapPoints.length]);

  const renderFooter = useCallback((props: BottomSheetFooterProps) => {
    if (!footer) return null;

    return (
      <BottomSheetFooter {...props} bottomInset={0}>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {footer}
        </View>
      </BottomSheetFooter>
    );
  }, [footer, insets.bottom]);

  return (
    <BottomSheet
      isOpen={visible}
      onOpenChange={(open) => {
        if (!open && visibleRef.current) onCloseRef.current();
      }}
    >
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content
          accessible={false}
          backgroundClassName="rounded-t-lg bg-background"
          contentContainerClassName="h-full p-0 pb-safe-offset-3"
          enableContentPanningGesture
          enableDynamicSizing={false}
          enableHandlePanningGesture
          enableOverDrag={false}
          enablePanDownToClose
          footerComponent={footer ? renderFooter : undefined}
          handleIndicatorClassName="bg-border"
          index={visible ? snapIndex : -1}
          keyboardBehavior="extend"
          onChange={(index) => {
            if (visible && index >= 0) setSnapIndex(index);
          }}
          ref={sheetRef}
          snapPoints={snapPoints}
          topInset={insets.top}
        >
          <View style={styles.header}>
            {headerLeading}
            <View style={styles.headerCopy}>
              <BottomSheet.Title>{title}</BottomSheet.Title>
              {description ? (
                <BottomSheet.Description numberOfLines={2}>{description}</BottomSheet.Description>
              ) : null}
            </View>
            <Button
              accessibilityLabel={snapIndex === snapPoints.length - 1 ? 'Collapse sheet' : 'Expand sheet'}
              className="h-10 w-10 rounded-lg"
              isIconOnly
              onPress={toggleExpanded}
              variant="secondary"
            >
              {snapIndex === snapPoints.length - 1 ? (
                <Minimize2 color="#3f3f46" size={18} />
              ) : (
                <Maximize2 color="#3f3f46" size={18} />
              )}
            </Button>
            <BottomSheet.Close accessibilityLabel="Close sheet" className="rounded-lg bg-default" />
          </View>
          <View style={styles.content}>{children}</View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 14,
    paddingHorizontal: 18,
    paddingTop: 10
  },
  headerCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  content: {
    flex: 1
  },
  footer: {
    backgroundColor: '#fafafa'
  }
});
