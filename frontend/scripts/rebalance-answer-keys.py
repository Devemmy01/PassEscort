"""Spread correct answers across A–D in the question bank.

Every question in the original data had its correct answer at option A, so a
student who always picked A scored 100%. This puts each question's options in
an order that depends only on the question itself — sorted by text, then
shuffled with a generator seeded by the question id — relabels them A–D and
points answerKey at the same answer text. Because the result doesn't depend on
the file's current order, re-running it changes nothing.

  python3 -I scripts/rebalance-answer-keys.py src/data
"""
import glob, hashlib, json, os, random, sys

data_dir = sys.argv[1]
changed = 0
for path in sorted(glob.glob(os.path.join(data_dir, '*Questions.json'))):
    if path.endswith('sampleQuestions.json'):
        continue
    questions = json.load(open(path, encoding='utf-8'))
    for q in questions:
        correct = next(o['text'] for o in q['options'] if o['key'] == q['answerKey'])
        texts = sorted(o['text'] for o in q['options'])
        rng = random.Random(int(hashlib.sha256(q['id'].encode()).hexdigest(), 16))
        rng.shuffle(texts)
        options = [{'key': 'ABCDE'[i], 'text': t} for i, t in enumerate(texts)]
        answer = 'ABCDE'[texts.index(correct)]
        if options != q['options'] or answer != q['answerKey']:
            changed += 1
        q['options'] = options
        q['answerKey'] = answer
    with open(path, 'w', encoding='utf-8') as f:
        f.write(json.dumps(questions, indent=2, ensure_ascii=False) + '\n')
print(f'Reordered options in {changed} questions')
