import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { AppBar, Button, Card, Chip, EmptyState, Row, Screen, Stack, SubjectIcon, Tag, Text, TextField } from '../components';
import { subjectMeta } from '../practice/subjects';
import { colors, layout, spacing } from '../theme';
import { getDatabase } from '../db/client';
import { seedQuestions } from '../db/seedQuestions';
import { getFilterFacets, searchQuestions } from '../db/questionsRepository';
import type { SQLExecutor } from '../db/executor';
import type { ExamBody, FilterFacets, Question } from '../types/question';
import { allSeedQuestions } from '../data/allQuestions';

const EXAM_BODIES: ExamBody[] = ['JAMB', 'WAEC', 'NECO'];
const SEARCH_DEBOUNCE_MS = 150;

type SeedStatus = { loading: true; failed?: false } | { loading: false; failed?: false; questionCount: number; skipped: boolean } | { loading: false; failed: true };

/** Browse and search the whole on-device bank (offline SQLite + FTS5). */
export default function QuestionBankScreen({ onBack }: { onBack?: () => void }) {
  const [db, setDb] = useState<SQLExecutor | null>(null);
  const [seedStatus, setSeedStatus] = useState<SeedStatus>({ loading: true });
  const [facets, setFacets] = useState<FilterFacets | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [subject, setSubject] = useState<string | null>(null);
  const [examBody, setExamBody] = useState<ExamBody | null>(null);
  const [results, setResults] = useState<Question[]>([]);
  const [searching, setSearching] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSeedStatus({ loading: true });
    (async () => {
      try {
        const database = await getDatabase();
        const result = await seedQuestions(database, allSeedQuestions);
        if (cancelled) return;
        setDb(database);
        setSeedStatus({ loading: false, questionCount: result.questionCount, skipped: result.skipped });
        setFacets(await getFilterFacets(database));
      } catch (e) {
        // Never leave a student on an endless spinner (low storage, corrupt file, or — on web — no FTS5).
        console.warn('Question bank failed to open', e);
        if (!cancelled) setSeedStatus({ loading: false, failed: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!db) return;
    let cancelled = false;
    setSearching(true);
    searchQuestions(db, {
      query: debouncedQuery || undefined,
      subject: subject ?? undefined,
      examBody: examBody ?? undefined,
    })
      .then((rows) => {
        if (!cancelled) setResults(rows);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [db, debouncedQuery, subject, examBody]);

  const toggleSubject = useCallback((value: string) => {
    setSubject((current) => (current === value ? null : value));
  }, []);

  const toggleExamBody = useCallback((value: ExamBody) => {
    setExamBody((current) => (current === value ? null : value));
  }, []);

  const statusLabel = useMemo(() => {
    if (seedStatus.loading) return 'Preparing questions on this phone…';
    if (seedStatus.failed) return 'Not available right now';
    return `${seedStatus.questionCount.toLocaleString('en-NG')} questions saved on this phone`;
  }, [seedStatus]);

  if (seedStatus.failed) {
    return (
      <Screen header={<AppBar title="Question bank" subtitle={statusLabel} onBack={onBack} />}>
        <EmptyState mood="sad" title="Couldn't open the question bank" message="Your progress is safe. This is usually fixed by trying again; if it keeps happening, free up some storage on your phone.">
          <Button title="Try again" icon="refresh" onPress={() => setAttempt((a) => a + 1)} />
          {onBack ? <Button title="Back to practice" variant="ghost" onPress={onBack} /> : null}
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen header={<AppBar title="Question bank" subtitle={statusLabel} onBack={onBack} />} scroll={false} padded={false}>
      <View style={styles.controls}>
        <TextField label="Search" icon="search" placeholder="Questions, topics, options…" value={query} onChangeText={setQuery} autoCorrect={false} />
        <Row gap={spacing.sm}>
          {EXAM_BODIES.map((eb) => (
            <Chip key={eb} label={eb} selected={examBody === eb} onPress={() => toggleExamBody(eb)} />
          ))}
        </Row>
      </View>

      {facets ? (
        <FlatList
          horizontal
          data={facets.subjects}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={styles.subjectRow}
          renderItem={({ item }) => <Chip label={item} icon={subjectMeta(item).icon} selected={subject === item} onPress={() => toggleSubject(item)} />}
        />
      ) : null}

      <Text variant="caption" color="textSecondary" style={styles.count} accessibilityLiveRegion="polite">
        {seedStatus.loading || searching ? 'Searching…' : `${results.length} result${results.length === 1 ? '' : 's'}`}
      </Text>

      {seedStatus.loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xxxl }} color={colors.primary} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState mood="think" title="No questions match" message="Try fewer words, or clear the exam and subject filters." />
          }
          renderItem={({ item }) => (
            <Card padding="md">
              <Stack gap={spacing.sm}>
                <Row gap={spacing.sm}>
                  <SubjectIcon subject={item.subject} size={32} />
                  <Text variant="label" style={{ flex: 1 }} numberOfLines={1}>
                    {item.subject}
                  </Text>
                  <Tag label={`${item.examBody} ${item.year}`} tone="primary" />
                </Row>
                <Row gap={spacing.xs} style={{ flexWrap: 'wrap' }}>
                  <Tag label={item.topic} />
                  <Tag label={item.difficulty[0]!.toUpperCase() + item.difficulty.slice(1)} tone={item.difficulty === 'hard' ? 'danger' : item.difficulty === 'medium' ? 'warning' : 'success'} />
                </Row>
                <Text variant="bodyStrong">{item.prompt}</Text>
                {item.options.map((opt) => {
                  const correct = opt.key === item.answerKey;
                  return (
                    <Row key={opt.key} gap={spacing.sm} style={{ alignItems: 'flex-start' }}>
                      <Text variant="label" color={correct ? 'successText' : 'textSecondary'} style={{ width: 20 }}>
                        {opt.key}
                      </Text>
                      <Text variant="body" color={correct ? 'successText' : 'text'} style={{ flex: 1 }}>
                        {opt.text}
                      </Text>
                      {correct ? <Tag label="Correct" tone="success" icon="check" /> : null}
                    </Row>
                  );
                })}
              </Stack>
            </Card>
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: layout.screenGutter, gap: spacing.md },
  subjectRow: { gap: spacing.sm, paddingHorizontal: layout.screenGutter, paddingTop: spacing.md },
  count: { paddingHorizontal: layout.screenGutter, paddingTop: spacing.md, paddingBottom: spacing.sm },
  list: { paddingHorizontal: layout.screenGutter, paddingBottom: spacing.xl },
});
