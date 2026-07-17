import { SearchField, Tabs } from 'heroui-native';
import { StyleSheet, View } from 'react-native';

const COUNTRY_OPTIONS = [
  { code: 'GLOBAL', label: '🌐 Global' },
  { code: 'US', label: '🇺🇸 US' },
  { code: 'ID', label: '🇮🇩 ID' },
  { code: 'SG', label: '🇸🇬 SG' },
  { code: 'GB', label: '🇬🇧 GB' }
] as const;

export function CatalogueFilters({
  country,
  onCountryChange,
  onQueryChange,
  query
}: {
  country: string;
  onCountryChange: (country: string) => void;
  onQueryChange: (query: string) => void;
  query: string;
}) {
  return (
    <View style={styles.filters}>
      <SearchField onChange={onQueryChange} value={query}>
        <SearchField.Group className="rounded-lg bg-surface">
          <SearchField.SearchIcon />
          <SearchField.Input
            autoCapitalize="none"
            autoCorrect={false}
            className="rounded-lg"
            placeholder="Search merchants or categories"
          />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>

      <Tabs onValueChange={onCountryChange} value={country} variant="primary">
        <Tabs.List className="rounded-lg bg-default">
          <Tabs.ScrollView showsHorizontalScrollIndicator={false}>
            <Tabs.Indicator />
            {COUNTRY_OPTIONS.map((option) => (
              <Tabs.Trigger key={option.code} value={option.code}>
                <Tabs.Label>{option.label}</Tabs.Label>
              </Tabs.Trigger>
            ))}
          </Tabs.ScrollView>
        </Tabs.List>
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  filters: {
    gap: 10
  }
});
