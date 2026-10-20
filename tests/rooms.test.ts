import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { RoomManager } from '../server/roomManager.ts';
import type { Room } from '../server/roomManager.ts';
import { TokenBucket } from '../server/rateLimit.ts';
import { currentPlayerId } from '../lib/game/engine.ts';
import type { SessionInfo } from '../lib/socket/events.ts';
import { c } from './helpers.ts';

function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}
function ok<T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> {
  assert.equal(r.ok, true, JSON.stringify(r));
  return r as Extract<T, { ok: true }>;
}
function code<T extends { ok: boolean }>(r: T): string {
  assert.equal(r.ok, false, 'expected a failure');
  return (r as unknown as { code: string }).code;
}

/** Create a room with `n` players, returns sessions in seat order. */
function lobby(mgr: RoomManager, n: number, rules?: unknown) {
  const host = ok(mgr.createRoom('sock-1', 'Ada', n, rules));
  const sessions: SessionInfo[] = [host.session];
  for (let i = 2; i <= n; i++) sessions.push(ok(mgr.joinRoom(`sock-${i}`, host.room.code, `Player${i}`)).session);
  return { room: host.room, sessions };
}
let actionCounter = 0;
const aid = () => `a${++actionCounter}`;

describe('room creation and joining', () => {
  test('creates a room with a short unambiguous code, a host and no secrets in the view', () => {
    const mgr = new RoomManager();
    const r = ok(mgr.createRoom('s1', '  Ada  ', 3, { mode: 'count' }));
    assert.match(r.room.code, /^[A-HJ-NP-Z2-9]{5}$/);
    assert.equal(r.room.hostId, r.session.playerId);
    assert.equal(r.room.rules.mode, 'count');
    assert.equal(r.room.rules.starsCountDouble, false);
    const view = mgr.view(r.room, r.session.playerId);
    const json = JSON.stringify(view);
    assert.ok(!json.includes(r.session.token), 'token must not appear in the public room view');
    assert.ok(!json.includes('tokenHash'));
    assert.equal(view.seats[0].nickname, 'Ada');
  });

  test('rejects bad input', () => {
    const mgr = new RoomManager();
    assert.equal(code(mgr.createRoom('s', '', 3, {})), 'INVALID_INPUT');
    assert.equal(code(mgr.createRoom('s', 'x'.repeat(17), 3, {})), 'INVALID_INPUT');
    assert.equal(code(mgr.createRoom('s', 'Ada', 5, {})), 'INVALID_INPUT');
    assert.equal(code(mgr.createRoom('s', 'Ada', 3, { mode: 'nope' })), 'INVALID_INPUT');
    assert.equal(code(mgr.createRoom('s', 42 as never, 3, {})), 'INVALID_INPUT');
  });

  test('invalid code, unknown room, full room, duplicate name, game already started', () => {
    const mgr = new RoomManager();
    const { room } = lobby(mgr, 2);
    assert.equal(code(mgr.joinRoom('x', 'abc', 'Bob')), 'INVALID_CODE');
    assert.equal(code(mgr.joinRoom('x', 'ZZZZZ', 'Bob')), 'ROOM_NOT_FOUND');
    assert.equal(code(mgr.joinRoom('x', room.code, 'Bob')), 'ROOM_FULL');
    const r3 = ok(mgr.createRoom('h', 'Host', 3, {}));
    assert.equal(code(mgr.joinRoom('x', r3.room.code, 'host')), 'NAME_TAKEN');
    ok(mgr.joinRoom('y', r3.room.code, 'Bob'));
    ok(mgr.startGame(r3.room.code, r3.session.playerId));
    assert.equal(code(mgr.joinRoom('z', r3.room.code, 'Cat')), 'GAME_IN_PROGRESS');
  });

  test('joining accepts lower-case and spaced codes (invite links, copy/paste)', () => {
    const mgr = new RoomManager();
    const room = ok(mgr.createRoom('h', 'Host', 3, {})).room;
    ok(mgr.joinRoom('q', ` ${room.code.toLowerCase()} `, 'Zed'));
  });

  test('settings: only the host, only in the lobby, validated, broadcast through the room', () => {
    const mgr = new RoomManager();
    const { room, sessions } = lobby(mgr, 3);
    assert.equal(code(mgr.updateSettings(room.code, sessions[1].playerId, { rules: { mode: 'count' } })), 'NOT_HOST');
    assert.equal(code(mgr.updateSettings(room.code, sessions[0].playerId, { rules: { mode: 'bad' } })), 'INVALID_INPUT');
    assert.equal(code(mgr.updateSettings(room.code, sessions[0].playerId, { maxPlayers: 2 })), 'INVALID_INPUT', 'cannot drop below seated players');
    ok(mgr.updateSettings(room.code, sessions[0].playerId, { maxPlayers: 4, rules: { mode: 'count', starsCountDouble: true, defence: false } }));
    assert.equal(room.rules.starsCountDouble, true);
    assert.equal(room.rules.defence, false);
    assert.equal(room.rules.fivePenalty, 3, 'untouched settings are preserved');
    ok(mgr.startGame(room.code, sessions[0].playerId));
    assert.equal(code(mgr.updateSettings(room.code, sessions[0].playerId, { rules: { mode: 'rollover' } })), 'WRONG_PHASE');
  });

  test('host-only start, minimum two players, kick, leave and host transfer', () => {
    const mgr = new RoomManager();
    const solo = ok(mgr.createRoom('a', 'Ada', 4, {}));
    assert.equal(code(mgr.startGame(solo.room.code, solo.session.playerId)), 'NOT_ENOUGH_PLAYERS');
    const b = ok(mgr.joinRoom('b', solo.room.code, 'Bob'));
    const c2 = ok(mgr.joinRoom('c', solo.room.code, 'Cy'));
    assert.equal(code(mgr.startGame(solo.room.code, b.session.playerId)), 'NOT_HOST');
    assert.equal(code(mgr.kick(solo.room.code, b.session.playerId, c2.session.playerId)), 'NOT_HOST');
    const k = ok(mgr.kick(solo.room.code, solo.session.playerId, c2.session.playerId));
    assert.equal(k.kickedSocketId, 'c');
    assert.equal(solo.room.seats.length, 2);
    ok(mgr.leave(solo.room.code, solo.session.playerId));
    assert.equal(solo.room.hostId, b.session.playerId, 'host passes to the next player');
    const last = ok(mgr.leave(solo.room.code, b.session.playerId));
    assert.equal(last.room, null);
    assert.equal(mgr.getRoom(solo.room.code), undefined, 'empty room is deleted');
  });
});

describe('actions: authorization, duplicates, stale state', () => {
  function started(n = 3) {
    const mgr = new RoomManager();
    const { room, sessions } = lobby(mgr, n);
    ok(mgr.startGame(room.code, sessions[0].playerId));
    return { mgr, room, sessions };
  }
  const byId = (room: Room, id: string) => room.game!.players.find((p) => p.id === id)!;

  test('strangers and out-of-turn players cannot act', () => {
    const { mgr, room, sessions } = started();
    const g = room.game!;
    assert.equal(code(mgr.draw(room.code, 'not-a-player', { version: g.version, actionId: aid() })), 'NOT_IN_ROOM');
    assert.equal(code(mgr.draw('ZZZZZ', sessions[0].playerId, { version: g.version, actionId: aid() })), 'ROOM_NOT_FOUND');
    const cur = currentPlayerId(g);
    const other = sessions.find((s) => s.playerId !== cur)!;
    assert.equal(code(mgr.draw(room.code, other.playerId, { version: g.version, actionId: aid() })), 'ILLEGAL_MOVE');
    const card = byId(room, other.playerId).hand[0];
    assert.equal(code(mgr.play(room.code, other.playerId, { cardId: card.id, version: g.version, actionId: aid() })), 'ILLEGAL_MOVE');
  });

  test('cannot play a card you do not hold (including one from an opponent hand)', () => {
    const { mgr, room } = started();
    const g = room.game!;
    const cur = currentPlayerId(g);
    const foreign = g.players.find((p) => p.id !== cur)!.hand[0];
    assert.equal(code(mgr.play(room.code, cur, { cardId: foreign.id, version: g.version, actionId: aid() })), 'ILLEGAL_MOVE');
  });

  test('a duplicated event is applied once; a stale version is refused', () => {
    const { mgr, room } = started(2);
    const g = room.game!;
    const cur = currentPlayerId(g);
    const id = aid();
    const v0 = g.version;
    ok(mgr.draw(room.code, cur, { version: v0, actionId: id }));
    assert.equal(room.game!.version, v0 + 1);
    assert.equal(code(mgr.draw(room.code, cur, { version: v0, actionId: id })), 'DUPLICATE');
    assert.equal(code(mgr.draw(room.code, cur, { version: v0, actionId: aid() })), 'STALE');
    assert.equal(room.game!.players.find((p) => p.id === cur)!.hand.length, 6, 'drew exactly once');
  });

  test('malformed payloads are rejected, not crashed on', () => {
    const { mgr, room, sessions } = started(2);
    const cur = currentPlayerId(room.game!);
    for (const bad of [null, {}, { version: 'x', actionId: 'a' }, { version: 0 }, { version: 0, actionId: 5 }]) {
      assert.equal(mgr.draw(room.code, cur, bad as never).ok, false);
    }
    assert.equal(code(mgr.play(room.code, cur, { cardId: 'x', calledShape: 'whot' as never, version: room.game!.version, actionId: aid() })), 'INVALID_INPUT');
    void sessions;
  });

  test('a legal scripted play (Pick 2) flows through and deals the penalty', () => {
    const { mgr, room } = started(2);
    const g = room.game!;
    g.players[0].hand = [c('circle', 2), c('circle', 4)];
    g.players[1].hand = [c('cross', 9), c('cross', 8)];
    g.discard = [c('circle', 7)];
    g.currentIndex = 0;
    ok(mgr.play(room.code, g.players[0].id, { cardId: 'circle-2', version: g.version, actionId: aid() }));
    assert.equal(room.game!.penalty?.pending, 2);
    assert.equal(code(mgr.play(room.code, g.players[1].id, { cardId: 'cross-9', version: room.game!.version, actionId: aid() })), 'ILLEGAL_MOVE');
    ok(mgr.draw(room.code, g.players[1].id, { version: room.game!.version, actionId: aid() }));
    assert.equal(room.game!.players[1].hand.length, 4);
  });
});

describe('privacy through the room view', () => {
  for (const n of [2, 3, 4]) {
    test(`${n} players: each client view hides every other hand and the market`, () => {
      const mgr = new RoomManager();
      const { room, sessions } = lobby(mgr, n);
      ok(mgr.startGame(room.code, sessions[0].playerId));
      const g = room.game!;
      for (const s of sessions) {
        const json = JSON.stringify(mgr.view(room, s.playerId));
        for (const p of g.players.filter((p) => p.id !== s.playerId)) {
          for (const card of p.hand) assert.ok(!json.includes(`"${card.id}"`), `${s.playerId} can see ${card.id}`);
        }
        for (const card of g.market) assert.ok(!json.includes(`"${card.id}"`));
        for (const other of sessions) if (other.playerId !== s.playerId) assert.ok(!json.includes(other.token));
      }
    });
  }
});

describe('full games through the manager', () => {
  for (const n of [2, 3, 4]) {
    for (const mode of ['rollover', 'count'] as const) {
      test(`${n} players, ${mode}: play to a result, then rematch with same settings`, () => {
        const mgr = new RoomManager();
        const { room, sessions } = lobby(mgr, n, { mode });
        ok(mgr.startGame(room.code, sessions[0].playerId));
        let guard = 0;
        while (room.phase === 'playing' && guard++ < 20000) {
          const g = room.game!;
          const cur = currentPlayerId(g);
          const view = mgr.view(room, cur).game!;
          const playable = view.you.playableCardIds;
          if (playable.length && guard % 17 !== 0) {
            const card = view.you.hand.find((h) => h.id === playable[0])!;
            ok(mgr.play(room.code, cur, { cardId: card.id, calledShape: 'circle', version: view.version, actionId: aid() }));
          } else {
            ok(mgr.draw(room.code, cur, { version: view.version, actionId: aid() }));
          }
        }
        assert.equal(room.phase, 'finished');
        assert.ok(room.game!.result);
        assert.equal(code(mgr.rematch(room.code, sessions[1].playerId)), 'NOT_HOST');
        const first = room.game!.players[room.game!.currentIndex].id;
        void first;
        ok(mgr.rematch(room.code, sessions[0].playerId));
        assert.equal(room.phase, 'playing');
        assert.equal(room.rules.mode, mode);
        assert.equal(room.gamesPlayed, 2);
        assert.equal(room.game!.players.length, n);
        assert.ok(room.game!.players.every((p) => p.hand.length === room.rules.cardsPerPlayer));
        assert.equal(code(mgr.rematch(room.code, sessions[0].playerId)), 'WRONG_PHASE');
      });
    }
  }

  test('host can end a game back to the lobby and start again', () => {
    const mgr = new RoomManager();
    const { room, sessions } = lobby(mgr, 3);
    ok(mgr.startGame(room.code, sessions[0].playerId));
    assert.equal(code(mgr.endGame(room.code, sessions[1].playerId)), 'NOT_HOST');
    ok(mgr.endGame(room.code, sessions[0].playerId));
    assert.equal(room.phase, 'lobby');
    assert.equal(room.game, null);
    ok(mgr.startGame(room.code, sessions[0].playerId));
  });
});

describe('disconnect and reconnect', () => {
  test('seat and hand are preserved; the right token restores them; wrong tokens cannot steal a seat', () => {
    const t = clock();
    const mgr = new RoomManager({ now: t.now, graceMs: 30_000 });
    const { room, sessions } = lobby(mgr, 3);
    ok(mgr.startGame(room.code, sessions[0].playerId));
    const victim = sessions[1];
    const handBefore = JSON.stringify(room.game!.players.find((p) => p.id === victim.playerId)!.hand);

    mgr.disconnect('sock-2');
    assert.equal(mgr.view(room, sessions[0].playerId).seats.find((s) => s.id === victim.playerId)!.connected, false);
    t.advance(10_000);
    mgr.sweep();
    assert.ok(room.seats.some((s) => s.id === victim.playerId), 'still seated within the grace period');

    assert.equal(code(mgr.reconnect('evil', { ...victim, token: 'not-the-token' })), 'BAD_TOKEN');
    assert.equal(code(mgr.reconnect('evil', { ...victim, token: sessions[2].token })), 'BAD_TOKEN', 'another player’s token does not work');
    assert.equal(code(mgr.reconnect('evil', { ...victim, playerId: 'nope' })), 'BAD_TOKEN');
    assert.equal(code(mgr.reconnect('evil', { ...victim, code: 'ZZZZZ' })), 'ROOM_NOT_FOUND');

    const back = ok(mgr.reconnect('sock-2b', victim));
    assert.equal(back.seat.socketId, 'sock-2b');
    const view = mgr.view(room, victim.playerId);
    assert.equal(JSON.stringify(view.game!.you.hand), handBefore, 'same hand restored');
    assert.equal(view.seats.find((s) => s.id === victim.playerId)!.connected, true);
  });

  test('a second tab with the right token replaces the first; a late disconnect of the old socket is ignored', () => {
    const mgr = new RoomManager();
    const { room, sessions } = lobby(mgr, 2);
    const r = ok(mgr.reconnect('new-sock', sessions[1]));
    assert.equal(r.replacedSocketId, 'sock-2');
    assert.equal(mgr.disconnect('sock-2'), null);
    assert.equal(room.seats[1].socketId, 'new-sock');
  });

  test('grace expiry mid-game removes the player; the game goes on with the rest', () => {
    const t = clock();
    const mgr = new RoomManager({ now: t.now, graceMs: 30_000 });
    const { room, sessions } = lobby(mgr, 3);
    ok(mgr.startGame(room.code, sessions[0].playerId));
    mgr.disconnect('sock-3');
    t.advance(31_000);
    const swept = mgr.sweep();
    assert.equal(swept.expiredSocketless.length, 1);
    assert.equal(room.seats.length, 2);
    assert.equal(room.game!.players.length, 2);
    assert.equal(room.phase, 'playing');
    assert.equal(code(mgr.reconnect('late', sessions[2])), 'BAD_TOKEN', 'seat is gone after expiry');
  });

  test('grace expiry with only one player left ends the game by forfeit', () => {
    const t = clock();
    const mgr = new RoomManager({ now: t.now, graceMs: 5_000 });
    const { room, sessions } = lobby(mgr, 2);
    ok(mgr.startGame(room.code, sessions[0].playerId));
    mgr.disconnect('sock-2');
    t.advance(6_000);
    mgr.sweep();
    assert.equal(room.phase, 'finished');
    assert.equal(room.game!.result!.reason, 'forfeit');
    assert.deepEqual(room.game!.result!.winnerIds, [sessions[0].playerId]);
  });

  test('an active game is not destroyed by one disconnect, and abandoned rooms are cleaned up', () => {
    const t = clock();
    const mgr = new RoomManager({ now: t.now, graceMs: 5_000, idleMs: 20_000 });
    const { room, sessions } = lobby(mgr, 3);
    ok(mgr.startGame(room.code, sessions[0].playerId));
    mgr.disconnect('sock-1');
    mgr.sweep();
    assert.ok(mgr.getRoom(room.code));
    mgr.disconnect('sock-2');
    mgr.disconnect('sock-3');
    t.advance(6_000);
    const s = mgr.sweep();
    assert.deepEqual(s.deleted, [room.code]);
    assert.equal(mgr.getRoom(room.code), undefined);
  });

  test('disconnected lobby members free their seat after the grace period; host transfers', () => {
    const t = clock();
    const mgr = new RoomManager({ now: t.now, graceMs: 5_000 });
    const { room, sessions } = lobby(mgr, 3);
    mgr.disconnect('sock-1');
    t.advance(6_000);
    mgr.sweep();
    assert.equal(room.seats.length, 2);
    assert.equal(room.hostId, sessions[1].playerId);
  });
});

describe('rate limiting', () => {
  test('token bucket allows bursts then throttles and refills', () => {
    let now = 0;
    const b = new TokenBucket(3, 1, () => now);
    assert.deepEqual([b.take(), b.take(), b.take(), b.take()], [true, true, true, false]);
    now += 2000;
    assert.deepEqual([b.take(), b.take(), b.take()], [true, true, false]);
  });
});

import { originAllowed } from '../server/validation.ts';
describe('origin allow-list', () => {
  test('empty list allows same-origin deployments; configured list is exact-match', () => {
    assert.equal(originAllowed([], undefined), true);
    assert.equal(originAllowed(['https://whot.vercel.app'], 'https://whot.vercel.app'), true);
    assert.equal(originAllowed(['https://whot.vercel.app/'], 'https://WHOT.vercel.app'), true);
    assert.equal(originAllowed(['https://whot.vercel.app'], 'https://evil.example'), false);
    assert.equal(originAllowed(['https://whot.vercel.app'], undefined), false);
    assert.equal(originAllowed(['https://whot.vercel.app'], 'https://whot.vercel.app.evil.example'), false);
  });
});

describe('reactions', () => {
  test('whitelisted ids only, members only, cooldown, works in lobby and after the game', () => {
    const t = clock();
    const mgr = new RoomManager({ now: t.now, reactionCooldownMs: 1000 });
    const { room, sessions } = lobby(mgr, 2);
    const r = ok(mgr.react(room.code, sessions[0].playerId, 'party'));
    assert.equal(r.reaction.reactionId, 'party');
    assert.equal(r.reaction.playerId, sessions[0].playerId);
    assert.equal(code(mgr.react(room.code, sessions[0].playerId, 'party')), 'RATE_LIMITED');
    t.advance(1001);
    ok(mgr.react(room.code, sessions[0].playerId, 'party'));
    assert.equal(code(mgr.react(room.code, 'stranger', 'party')), 'NOT_IN_ROOM');
    assert.equal(code(mgr.react('ZZZZZ', sessions[0].playerId, 'party')), 'ROOM_NOT_FOUND');
    for (const bad of ['', 'PARTY', 'x'.repeat(500), 5, null, undefined, {}]) {
      assert.equal(code(mgr.react(room.code, sessions[1].playerId, bad)), 'INVALID_INPUT');
    }
    ok(mgr.startGame(room.code, sessions[0].playerId));
    t.advance(2000);
    ok(mgr.react(room.code, sessions[1].playerId, 'cry'));
    const a = ok(mgr.react(room.code, sessions[0].playerId, 'cry')).reaction;
    t.advance(1500);
    const b = ok(mgr.react(room.code, sessions[0].playerId, 'cry')).reaction;
    assert.notEqual(a.id, b.id, 'each reaction has a unique id');
    assert.ok(!JSON.stringify(mgr.view(room, sessions[0].playerId)).includes('cry'), 'reactions are not part of room state');
  });
});

describe('cumulative scoreboard (server-authoritative)', () => {
  /** Finish the current round by making p[winner] play their only card. */
  function playOut(mgr: RoomManager, room: Room, winnerIdx: number, hands: Array<Array<ReturnType<typeof c>>>) {
    const g = room.game!;
    hands.forEach((h, i) => (g.players[i].hand = h.map((x) => ({ ...x }))));
    g.discard = [c('circle', 7)];
    g.market = Array.from({ length: 10 }, (_, i) => c('square', 100 + i));
    g.penalty = null;
    g.calledShape = null;
    g.currentIndex = winnerIdx;
    const w = g.players[winnerIdx];
    ok(mgr.play(room.code, w.id, { cardId: w.hand[0].id, version: g.version, actionId: aid() }));
    assert.equal(room.phase, 'finished');
  }

  test('scores add up across rounds (lowest total best), survive rematches, reset only on a new game', () => {
    const mgr = new RoomManager();
    const { room, sessions } = lobby(mgr, 3);
    const [a, b, d] = sessions.map((s) => s.playerId);
    ok(mgr.startGame(room.code, a));
    assert.equal(room.round, 1);
    assert.deepEqual(mgr.view(room, a).scores, [], 'nothing scored yet');

    // Round 1: Ada (seat 0) goes out. Bola holds 2+12 = 14, Cy holds 20 (Whot).
    playOut(mgr, room, 0, [[c('circle', 4)], [c('cross', 2), c('cross', 12)], [{ id: 'whot-1', shape: 'whot', number: 20 }]]);
    let v = mgr.view(room, a);
    assert.deepEqual(v.scores.map((s) => [s.playerId, s.total, s.wins]), [[a, 0, 1], [d, 20, 0], [b, 14, 0]].sort((x, y) => (x[1] as number) - (y[1] as number)));
    assert.equal(v.rounds.length, 1);
    assert.equal(v.rounds[0].round, 1);

    // Same state read again must not double count.
    mgr.view(room, a);
    assert.equal(mgr.view(room, a).scores.find((s) => s.playerId === b)!.total, 14);

    // Round 2 via rematch: scores carry over. Bola goes out; Ada holds 5, Cy holds 3+3.
    ok(mgr.rematch(room.code, a));
    assert.equal(room.round, 2);
    assert.equal(mgr.view(room, a).scores.find((s) => s.playerId === b)!.total, 14, 'a new round does not reset scores');
    playOut(mgr, room, 1, [[c('circle', 5)], [c('circle', 4)], [c('square', 3), c('triangle', 3)]]);
    v = mgr.view(room, d);
    const by = Object.fromEntries(v.scores.map((s) => [s.playerId, s]));
    assert.deepEqual([by[a].total, by[b].total, by[d].total], [5, 14, 26]);
    assert.deepEqual([by[a].wins, by[b].wins, by[d].wins], [1, 1, 0]);
    assert.deepEqual(v.scores.map((s) => s.playerId), [a, b, d], 'sorted lowest total first');
    assert.equal(v.rounds.length, 2);
    assert.deepEqual(v.rounds[1].results.find((r) => r.winner)!.playerId, b);

    // Back to the lobby keeps nothing visible, and starting a genuinely new game resets everything.
    ok(mgr.endGame(room.code, a));
    ok(mgr.startGame(room.code, a));
    assert.equal(room.round, 1);
    assert.deepEqual(mgr.view(room, a).scores, []);
    assert.deepEqual(mgr.view(room, a).rounds, []);
  });

  test('count-mode rounds feed the same scoreboard using value totals', () => {
    const mgr = new RoomManager();
    const { room, sessions } = lobby(mgr, 2, { mode: 'count' });
    const [a, b] = sessions.map((s) => s.playerId);
    ok(mgr.startGame(room.code, a));
    const g = room.game!;
    g.players[0].hand = [c('circle', 2), c('circle', 12), { id: 'whot-1', shape: 'whot', number: 20 }];
    g.players[1].hand = [c('cross', 1), c('triangle', 4)];
    g.market = [c('square', 5)];
    g.discard = [c('circle', 7)];
    g.currentIndex = 1;
    ok(mgr.draw(room.code, b, { version: g.version, actionId: aid() }));
    assert.equal(room.phase, 'finished');
    const v = mgr.view(room, a);
    assert.deepEqual(v.scores.map((s) => [s.playerId, s.total, s.wins]), [[b, 10, 1], [a, 34, 0]]);
    assert.deepEqual(v.game!.result!.winnerIds, [b]);
  });

  test('a forfeit finish is scored once and survives the leaver’s departure', () => {
    const t = clock();
    const mgr = new RoomManager({ now: t.now, graceMs: 1000 });
    const { room, sessions } = lobby(mgr, 2);
    ok(mgr.startGame(room.code, sessions[0].playerId));
    mgr.disconnect('sock-2');
    t.advance(2000);
    mgr.sweep();
    mgr.sweep();
    assert.equal(room.phase, 'finished');
    const rows = mgr.view(room, sessions[0].playerId).scores;
    assert.equal(rows.length, 1, 'only players who were in the finished round are scored, once');
    assert.equal(rows[0].playerId, sessions[0].playerId);
    assert.equal(rows[0].wins, 1);
  });
});
