import { useCallback, useEffect, useState } from "react";

/**
 * Load a list from the API and expose a reload function.
 * @param {() => Promise<unknown[]>} loadRows
 */
export function useResource(loadRows) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await loadRows();
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      setRows([]);
      setLoadError(error instanceof Error ? error.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [loadRows]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { rows, loading, loadError, reload };
}
