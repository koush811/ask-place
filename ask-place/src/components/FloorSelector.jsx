const FLOORS = [
  { key: 'floor_1F', label: '1F' },
  { key: 'floor_2F', label: '2F' },
  { key: 'floor_3F', label: '3F' },
  { key: 'floor_4F', label: '4F' },
  { key: 'floor_5F', label: '5F' },
]

export default function FloorSelector({ activeFloor, onChange }) {
  return (
    <div className="floor-selector" role="radiogroup" aria-label="フロア切替">
      {FLOORS.map((f) => (
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
