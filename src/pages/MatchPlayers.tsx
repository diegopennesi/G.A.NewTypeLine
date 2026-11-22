import { useEffect, useState } from 'react'
import { findAvatar, type AvatarId } from '../data/avatars'
import type { Game } from '../models/game'
import { shareLobbyAvatar, watchAvatar, watchLobbyAvatar } from '../services/accountService'

function MatchPlayer({ code, uid, name, team, ready, own }: {
  code: string; uid: string | null; name: string | null; team: Game['playerOneTeam']; ready: boolean; own: boolean
}) {
  const [avatarId, setAvatarId] = useState<AvatarId | null>(null)
  useEffect(() => {
    if (!uid) return
    if (!own) return watchLobbyAvatar(code, uid, setAvatarId)
    return watchAvatar(uid, avatar => {
      setAvatarId(avatar)
      void shareLobbyAvatar(code, uid, avatar).catch(() => {})
    }, () => setAvatarId(null))
  }, [code, own, uid])

  const avatar = findAvatar(avatarId)
  return <p data-team={team} data-portrait={!!avatar}>
    {avatar && ('src' in avatar ? <img src={avatar.src} alt="" /> : <i aria-hidden="true">?</i>)}
    <b>{name ?? 'In attesa…'}</b>
    {(own || ready) && <span>{own ? 'Tu' : ''}{ready ? ' ✓' : ''}</span>}
  </p>
}

export function MatchPlayers({ game, playerId }: { game: Game; playerId: string }) {
  return <div className="player-list" aria-label="Giocatori">
    <MatchPlayer key={`${game.code}/${game.playerOneId}`} code={game.code} uid={game.playerOneId}
      name={game.playerOneName} team={game.playerOneTeam} ready={game.playerOneReady} own={game.playerOneId === playerId} />
    <MatchPlayer key={`${game.code}/${game.playerTwoId ?? 'waiting'}`} code={game.code} uid={game.playerTwoId}
      name={game.playerTwoName} team={game.playerTwoTeam} ready={game.playerTwoReady} own={game.playerTwoId === playerId} />
  </div>
}
