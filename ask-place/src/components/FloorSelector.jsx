/**
 * floorOrder / floorLabels(campus_map_data.jsonから)を受け取ってフロアタブを表示する。
 * availableFloors を渡すと、その階だけを表示する(経路検索中に
 * 経路が通っていない階を隠す用途)。省略時は floorOrder の全階を表示する。
 */
export default function FloorSelector({ activeFloor, onChange, floorOrder, floorLabels, availableFloors }) {
  const floors = (availableFloors ? floorOrder.filter((f) => availableFloors.includes(f)) : floorOrder)
    .map((key) => ({ key, label: floorLabels[key] ?? key }))

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
