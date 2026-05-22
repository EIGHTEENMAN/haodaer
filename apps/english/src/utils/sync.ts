const AUTH_BASE = 'https://grandand.com'

export async function syncGameData(level: number, score: number) {
  const token = sessionStorage.getItem('haodaer_token')
  const profile = localStorage.getItem('haodaer_active_profile')
  if (!token || !profile) return
  try {
    const p = JSON.parse(profile)
    if (!p.id) return
    await fetch(`${AUTH_BASE}/api/user/children/${p.id}/game-data`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({ gameLevel: level, gameScore: score }),
    })
  } catch {
    /* non-critical sync, ignore */
  }
}

export async function syncChallengePoints(points: number) {
  const token = sessionStorage.getItem('haodaer_token')
  const profile = localStorage.getItem('haodaer_active_profile')
  if (!token || !profile) return
  try {
    const p = JSON.parse(profile)
    if (!p.id) return
    await fetch(`${AUTH_BASE}/api/user/children/${p.id}/challenge-points`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({ points }),
    })
  } catch {
    /* non-critical sync, ignore */
  }
}
