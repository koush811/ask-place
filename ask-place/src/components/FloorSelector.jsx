const ALL_FLOORS = [
  { key: 'floor_1F', label: '1F' },
  { key: 'floor_2F', label: '2F' },
  { key: 'floor_3F', label: '3F' },
  { key: 'floor_4F', label: '4F' },
  { key: 'floor_5F', label: '5F' },
]

/**
 * availableFloors を渡すと、その階だけを表示する(経路検索中に
 * 経路が通っていない階を隠す用途)。省略時は全フロアを表示する。
 */
export default function FloorSelector({ activeFloor, onChange, availableFloors }) {
  const floors = availableFloors
    ? ALL_FLOORS.filter((f) => availableFloors.includes(f.key))
    : ALL_FLOORS

  return (
    <div className="floor-selector" role="radiogroup" aria-label="フロア切替">
      {floors.map((f) => (
        <button
          key={f.key}
          type="button"
          role="radio"
          aria-checked={activeFloor === f.key}
          className={`floor-btn${activeFloor === f.key ? ' active' : ''}`}
          onClick={() => onChange(f.key)}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}