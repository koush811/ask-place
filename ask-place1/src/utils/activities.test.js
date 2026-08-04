import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeActivitiesWithFirestore } from './activities.js'

const fallbackActivities = [
  { id: 'mechanical', name: '機械系学科', rooms: ['N109'] },
  { id: 'electrical', name: '電気系学科', rooms: ['N201'] },
]

test('Firestore のドキュメントを既存の activity.json とマージして、未保存の学科を残す', () => {
  const firestoreActivities = [{ id: 'mechanical', description: '機械系学科の説明' }]

  const merged = mergeActivitiesWithFirestore(fallbackActivities, firestoreActivities)

  assert.equal(merged.length, 2)
  assert.deepEqual(merged.find((activity) => activity.id === 'mechanical'), {
    id: 'mechanical',
    name: '機械系学科',
    rooms: ['N109'],
    description: '機械系学科の説明',
  })
  assert.deepEqual(merged.find((activity) => activity.id === 'electrical'), {
    id: 'electrical',
    name: '電気系学科',
    rooms: ['N201'],
  })
})
