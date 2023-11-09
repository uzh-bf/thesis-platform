import localForage from 'localforage'
import { useEffect, useState } from 'react'

function useLocalStorage<T>(
  storageKey: string
): [T | false | null, (value: T) => Promise<T>] {
  const [storedValue, setStoredValue] = useState<T | false | null>(null)

  useEffect(() => {
    const loadStoredValue = async () => {
      try {
        let valueFromStorage: T | null = await localForage.getItem(storageKey)
        if (valueFromStorage) {
          setStoredValue(valueFromStorage)
        } else {
          setStoredValue(false)
        }
      } catch (error) {
        console.error(error)
      }
    }
    loadStoredValue()
  }, [storageKey])

  async function setItemAndStore(value: T) {
    await localForage.setItem(storageKey, value)
    setStoredValue(value)
    return value
  }

  return [storedValue, setItemAndStore]
}

export default useLocalStorage
