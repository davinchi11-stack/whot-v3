import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildDeck, secureRandomInt, shuffle, DECK_DISTRIBUTION } from '../lib/game/deck.ts';
import { applyDraw, applyPlay, createGame, currentPlayerId, playableCards, removePlayer } from '../lib/game/engine.ts';
import { normalizeRules, DEFAULT_RULES, isSpecialCard } from '../lib/game/rules.ts';
import { sanitizeGame } from '../lib/game/view.ts';
import { c, must, rules, scenario, seeded, whot } from './helpers.ts';

describe('deck', () => {
  test('has the verified 54-card Nigerian composition', () => {
    const deck = buildDeck();
    assert.equal(deck.length, 54);
    const count = (s: string) => deck.filter((d) => d.shape === s).length;
    assert.deepEqual(
      ['circle', 'triangle', 'cross', 'square', 'star', 'whot'].map(count),
      [12, 12, 9, 9, 7, 5],
    );
    assert.equal(new Set(deck.map((d) => d.id)).size, 54, 'ids are unique');
    assert.deepEqual(DECK_DISTRIBUTION.star, [1, 2, 3, 4, 5, 7, 8]);
    assert.ok(deck.filter((d) => d.shape === 'whot').every((d) => d.number === 20));
    // 6, 9 do not exist in any shape; 12 only in circle/triangle
    assert.equal(deck.filter((d) => d.number === 6 || d.number === 9).length, 0);
    assert.equal(deck.filter((d) => d.number === 12).length, 2);
  });

  test('shuffle keeps the same cards and is not the identity', () => {
    const deck = buildDeck();
    const s = shuffle(deck, seeded(3));
    assert.equal(s.length, deck.length);
    assert.deepEqual(s.map((x) => x.id).sort(), deck.map((x) => x.id).sort());
    assert.notDeepEqual(s.map((x) => x.id), deck.map((x) => x.id));
  });

  test('secureRandomInt stays within bounds', () => {
    for (let i = 0; i < 500; i++) {
      const n = secureRandomInt(7);
      assert.ok(n >= 0 && n < 7);
    }
    assert.throws(() => secureRandomInt(0));
  });
});

describe('deal', () => {
  for (const n of [2, 3, 4]) {
    test(`${n} players: correct hands, ordinary starting card, no duplicates`, () => {
      const ids = Array.from({ length: n }, (_, i) => `p${i}`);
      const g = createGame(ids, rules({ cardsPerPlayer: 6 }), { rng: seeded(n) });
      assert.ok(g.players.every((p) => p.hand.length === 6));
      assert.equal(g.discard.length, 1);
      assert.equal(isSpecialCard(g.discard[0], g.rules), false);
      const all = [...g.players.flatMap((p) => p.hand), ...g.market, ...g.discard];
      assert.equal(all.length, 54);
      assert.equal(new Set(all.map((x) => x.id)).size, 54);
      assert.equal(g.market.length, 54 - n * 6 - 1);
    });
  }
  test('rejects 1 or 5 players', () => {
    assert.throws(() => createGame(['a'], rules()));
    assert.throws(() => createGame(['a', 'b', 'c', 'd', 'e'], rules()));
  });
});

describe('matching', () => {
  const base = () => scenario({ hands: [[c('circle', 4), c('triangle', 9), c('star', 3), c('cross', 7)], [c('cross', 10), c('square', 11)]], top: c('circle', 7) });

  test('plays by shape and by number; rejects mismatches', () => {
    const g = base();
    assert.deepEqual(playableCards(g, 'p1').map((x) => x.id).sort(), ['circle-4', 'cross-7']);
    const r = applyPlay(g, 'p1', 'triangle-9');
    assert.equal(r.ok, false);
    must(applyPlay(g, 'p1', 'circle-4'));
    must(applyPlay(g, 'p1', 'cross-7'));
  });

  test('turn advances; wrong player and foreign cards rejected', () => {
    const g = base();
    const next = must(applyPlay(g, 'p1', 'circle-4')).state;
    assert.equal(currentPlayerId(next), 'p2');
    assert.equal(applyPlay(next, 'p1', 'cross-7').ok, false);
    assert.equal(applyPlay(next, 'p2', 'circle-4').ok, false);
    assert.equal(applyDraw(next, 'p1').ok, false);
  });

  test('input state is not mutated by an accepted action', () => {
    const g = base();
    const snapshot = JSON.stringify(g);
    must(applyPlay(g, 'p1', 'circle-4'));
    assert.equal(JSON.stringify(g), snapshot);
  });

  test('drawing takes one card and passes the turn', () => {
    const g = base();
    const r = must(applyDraw(g, 'p1')).state;
    assert.equal(r.players[0].hand.length, 5);
    assert.equal(currentPlayerId(r), 'p2');
  });
});

describe('whot card', () => {
  test('requires a called shape; next player must follow it or play Whot', () => {
    const g = scenario({ hands: [[whot(1), c('circle', 3)], [c('triangle', 3), c('star', 3), whot(2)], []].slice(0, 2), top: c('circle', 7) });
    assert.equal(applyPlay(g, 'p1', 'whot-1').ok, false);
    assert.equal(applyPlay(g, 'p1', 'whot-1', { calledShape: 'whot' as never }).ok, false);
    const s = must(applyPlay(g, 'p1', 'whot-1', { calledShape: 'star' })).state;
    assert.equal(s.calledShape, 'star');
    assert.deepEqual(playableCards(s, 'p2').map((x) => x.id).sort(), ['star-3', 'whot-2']);
    // number match no longer applies after a Whot
    assert.equal(applyPlay(s, 'p2', 'triangle-3').ok, false);
    const s2 = must(applyPlay(s, 'p2', 'star-3')).state;
    assert.equal(s2.calledShape, null);
  });

  test('drawing keeps the called shape in force', () => {
    const g = scenario({ hands: [[whot(1), c('circle', 3)], [c('triangle', 3), c('cross', 9)]], top: c('circle', 7) });
    let s = must(applyPlay(g, 'p1', 'whot-1', { calledShape: 'star' })).state;
    s = must(applyDraw(s, 'p2')).state;
    assert.equal(s.calledShape, 'star');
  });
});

describe('special cards', () => {
  test('Hold On: same player plays again', () => {
    const g = scenario({ hands: [[c('circle', 1), c('circle', 4)], [c('cross', 9), c('cross', 2)], [c('square', 4), c('square', 3)]], top: c('circle', 7) });
    const s = must(applyPlay(g, 'p1', 'circle-1')).state;
    assert.equal(currentPlayerId(s), 'p1');
  });

  test('Pick 2: next player must draw 2 (no defence card), then turn passes', () => {
    const g = scenario({ hands: [[c('circle', 2), c('circle', 4)], [c('cross', 9), c('cross', 8)], [c('square', 4), c('square', 3)]], top: c('circle', 7) });
    let s = must(applyPlay(g, 'p1', 'circle-2')).state;
    assert.equal(currentPlayerId(s), 'p2');
    assert.deepEqual(s.penalty && { kind: s.penalty.kind, pending: s.penalty.pending }, { kind: 'pick2', pending: 2 });
    assert.equal(applyPlay(s, 'p2', 'cross-9').ok, false, 'cannot ignore penalty');
    s = must(applyDraw(s, 'p2')).state;
    assert.equal(s.players[1].hand.length, 4);
    assert.equal(s.penalty, null);
    assert.equal(currentPlayerId(s), 'p3');
  });

  test('5-card defaults to Pick 3; configurable to Pick 5', () => {
    const mk = (fivePenalty: 3 | 5) => scenario({ hands: [[c('circle', 5), c('circle', 4)], [c('cross', 9), c('cross', 8)]], top: c('circle', 7), rules: { fivePenalty } });
    let s = must(applyPlay(mk(3), 'p1', 'circle-5')).state;
    assert.equal(s.penalty?.pending, 3);
    s = must(applyDraw(s, 'p2')).state;
    assert.equal(s.players[1].hand.length, 5);
    s = must(applyPlay(mk(5), 'p1', 'circle-5')).state;
    assert.equal(s.penalty?.pending, 5);
    s = must(applyDraw(s, 'p2')).state;
    assert.equal(s.players[1].hand.length, 7);
  });

  test('General Market: all others draw 1 and the player plays again (configurable)', () => {
    const hands = [[c('circle', 14), c('circle', 4)], [c('cross', 9)], [c('square', 4)]];
    let s = must(applyPlay(scenario({ hands, top: c('circle', 7) }), 'p1', 'circle-14')).state;
    assert.deepEqual(s.players.map((p) => p.hand.length), [1, 2, 2]);
    assert.equal(currentPlayerId(s), 'p1');
    s = must(applyPlay(scenario({ hands, top: c('circle', 7), rules: { generalMarketPlaysAgain: false } }), 'p1', 'circle-14')).state;
    assert.equal(currentPlayerId(s), 'p2');
  });

  test('Suspension (8): skips the next player; in 2 players it returns to the player', () => {
    const three = scenario({ hands: [[c('circle', 8), c('circle', 4)], [c('cross', 9)], [c('square', 4)]], top: c('circle', 7) });
    assert.equal(currentPlayerId(must(applyPlay(three, 'p1', 'circle-8')).state), 'p3');
    const two = scenario({ hands: [[c('circle', 8), c('circle', 4)], [c('cross', 9)]], top: c('circle', 7) });
    assert.equal(currentPlayerId(must(applyPlay(two, 'p1', 'circle-8')).state), 'p1');
    const off = scenario({ hands: [[c('circle', 8), c('circle', 4)], [c('cross', 9)], [c('square', 4)]], top: c('circle', 7), rules: { suspension8: false } });
    assert.equal(currentPlayerId(must(applyPlay(off, 'p1', 'circle-8')).state), 'p2');
  });

  test('Direction change on pick cards only when enabled and requested', () => {
    const hands = [[c('circle', 2), c('circle', 4)], [c('cross', 9)], [c('square', 4)]];
    const on = scenario({ hands, top: c('circle', 7), rules: { directionChange: true } });
    const rev = must(applyPlay(on, 'p1', 'circle-2', { reverse: true })).state;
    assert.equal(rev.direction, -1);
    assert.equal(currentPlayerId(rev), 'p3');
    const plain = must(applyPlay(on, 'p1', 'circle-2')).state;
    assert.equal(plain.direction, 1);
    const off = scenario({ hands, top: c('circle', 7) });
    assert.equal(must(applyPlay(off, 'p1', 'circle-2', { reverse: true })).state.direction, 1);
  });
});

describe('penalty defence', () => {
  const three = (over = {}) =>
    scenario({
      hands: [[c('circle', 2), c('circle', 4)], [c('cross', 2), c('cross', 8)], [c('square', 2), c('square', 3)]],
      top: c('circle', 7),
      rules: over,
    });

  test('defence + stacking: penalty accumulates and the last non-defender draws it all', () => {
    let s = three();
    s = must(applyPlay(s, 'p1', 'circle-2')).state;
    s = must(applyPlay(s, 'p2', 'cross-2')).state;
    assert.equal(s.penalty?.pending, 4);
    s = must(applyPlay(s, 'p3', 'square-2')).state;
    assert.equal(s.penalty?.pending, 6);
    assert.equal(currentPlayerId(s), 'p1');
    s = must(applyDraw(s, 'p1')).state;
    assert.equal(s.players[0].hand.length, 1 + 6);
  });

  test('defence without stacking: counter deflects, penalty stays at one card’s worth', () => {
    let s = three({ stacking: false });
    s = must(applyPlay(s, 'p1', 'circle-2')).state;
    s = must(applyPlay(s, 'p2', 'cross-2')).state;
    assert.equal(s.penalty?.pending, 2);
    assert.equal(currentPlayerId(s), 'p3');
  });

  test('defence disabled: counter cards are illegal, penalty must be drawn', () => {
    let s = three({ defence: false });
    s = must(applyPlay(s, 'p1', 'circle-2')).state;
    assert.equal(applyPlay(s, 'p2', 'cross-2').ok, false);
    assert.deepEqual(playableCards(s, 'p2'), []);
    s = must(applyDraw(s, 'p2')).state;
    assert.equal(s.players[1].hand.length, 4);
    assert.equal(currentPlayerId(s), 'p3');
  });

  test('compatibility: a 5 cannot answer a 2 unless pick5Counters = any-penalty', () => {
    const hands = [[c('circle', 2), c('circle', 4)], [c('cross', 5), c('cross', 8)], [c('square', 9)]];
    let s = scenario({ hands, top: c('circle', 7) });
    s = must(applyPlay(s, 'p1', 'circle-2')).state;
    assert.equal(applyPlay(s, 'p2', 'cross-5').ok, false);

    s = scenario({ hands, top: c('circle', 7), rules: { pick5Counters: 'any-penalty' } });
    s = must(applyPlay(s, 'p1', 'circle-2')).state;
    s = must(applyPlay(s, 'p2', 'cross-5')).state;
    assert.equal(s.penalty?.kind, 'pick5');
    assert.equal(s.penalty?.pending, 2 + 3, 'mixed penalties accumulate when stacking');
  });

  test('a normal matching card is not a defence', () => {
    let s = three();
    s = must(applyPlay(s, 'p1', 'circle-2')).state;
    assert.equal(applyPlay(s, 'p2', 'cross-8').ok, false);
    const w = scenario({ hands: [[c('circle', 2), c('circle', 4)], [whot(1), c('cross', 8)]], top: c('circle', 7) });
    const s2 = must(applyPlay(w, 'p1', 'circle-2')).state;
    assert.equal(applyPlay(s2, 'p2', 'whot-1', { calledShape: 'star' }).ok, false, 'Whot cannot defend a penalty');
  });
});

describe('rollover', () => {
  test('winner is whoever plays their last card; others ranked by penalty value', () => {
    const g = scenario({ hands: [[c('circle', 4)], [c('star', 7), c('cross', 3)], [c('square', 3)]], top: c('circle', 7) });
    const s = must(applyPlay(g, 'p1', 'circle-4')).state;
    assert.equal(s.status, 'finished');
    assert.deepEqual(s.result?.winnerIds, ['p1']);
    const byId = Object.fromEntries(s.result!.ranking.map((r) => [r.playerId, r]));
    assert.equal(byId.p2.points, 10, 'printed values: star 7 + cross 3');
    assert.deepEqual(byId.p2.hand.map((h) => h.value).sort(), [3, 7], 'each remaining card shows its value');
    assert.equal(byId.p3.rank, 2);
    assert.equal(byId.p2.rank, 3);
    assert.equal(applyDraw(s, 'p2').ok, false);
  });

  test('finishing on a special card: allowed by default, illegal when finishOnSpecial = false', () => {
    const hands = [[c('circle', 14)], [c('cross', 9)], [c('square', 4)]];
    const ok = must(applyPlay(scenario({ hands, top: c('circle', 7) }), 'p1', 'circle-14')).state;
    assert.equal(ok.status, 'finished');
    assert.deepEqual(ok.players.map((p) => p.hand.length), [0, 1, 1], 'final-card General Market does not make others draw');
    const bad = applyPlay(scenario({ hands, top: c('circle', 7), rules: { finishOnSpecial: false } }), 'p1', 'circle-14');
    assert.equal(bad.ok, false);
  });

  test('final-card Pick 2 ends the game immediately with no pending penalty', () => {
    const g = scenario({ hands: [[c('circle', 2)], [c('cross', 9)]], top: c('circle', 7) });
    const s = must(applyPlay(g, 'p1', 'circle-2')).state;
    assert.equal(s.status, 'finished');
    assert.equal(s.penalty, null);
  });

  test('final-card Whot wins', () => {
    const g = scenario({ hands: [[whot(1)], [c('cross', 9)]], top: c('circle', 7) });
    assert.equal(must(applyPlay(g, 'p1', 'whot-1', { calledShape: 'star' })).state.result?.winnerIds[0], 'p1');
  });
});

describe('empty market', () => {
  test('rollover: discard pile is reshuffled into the market (top card stays)', () => {
    const g = scenario({ hands: [[c('circle', 4), c('cross', 8)], [c('cross', 9), c('cross', 3)]], top: c('circle', 7), market: [] });
    g.discard = [c('star', 1), c('star', 2), c('star', 3), c('circle', 7)];
    const s = must(applyDraw(g, 'p1')).state;
    assert.equal(s.players[0].hand.length, 3);
    assert.equal(s.discard.length, 1);
    assert.equal(s.discard[0].id, 'circle-7');
    assert.equal(s.market.length, 2);
    assert.ok(s.history.some((h) => h.type === 'reshuffle'));
  });

  test('rollover: a penalty bigger than the market triggers a reshuffle and is paid in full', () => {
    const g = scenario({ hands: [[c('circle', 5), c('circle', 4)], [c('cross', 9)]], top: c('circle', 7), market: [c('star', 1)] });
    g.discard = [c('triangle', 12), c('circle', 7)];
    let s = must(applyPlay(g, 'p1', 'circle-5')).state;
    s = must(applyDraw(s, 'p2')).state;
    assert.equal(s.players[1].hand.length, 1 + 3, 'paid all 3 cards: 1 from the market + 2 after the reshuffle');
    assert.ok(s.history.some((h) => h.type === 'reshuffle'));
    assert.equal(s.status, 'playing');
  });

  test('rollover: stalemate when nothing can be drawn anywhere', () => {
    let s = scenario({ hands: [[c('circle', 4), c('cross', 8)], [c('star', 4), c('cross', 9)]], top: c('circle', 7), market: [] });
    s.discard = [c('circle', 7)];
    s = must(applyDraw(s, 'p1')).state;
    assert.equal(s.status, 'playing');
    s = must(applyDraw(s, 'p2')).state;
    assert.equal(s.status, 'finished');
    assert.equal(s.result?.reason, 'stalemate');
  });
});

describe('count mode: the lowest SUM OF CARD VALUES wins', () => {
  const total = (s: ReturnType<typeof scenario>, id: string) => s.result!.ranking.find((r) => r.playerId === id)!;

  test('the brief’s example: 2 + 12 + 20 = 34 loses to 1 + 4 + 5 = 10', () => {
    const g = scenario({
      hands: [[c('circle', 2), c('circle', 12), whot(1)], [c('cross', 1), c('triangle', 4)]],
      top: c('circle', 7), market: [c('square', 5)], current: 1, rules: { mode: 'count' },
    });
    const s = must(applyDraw(g, 'p2')).state; // p2 draws the last market card (a 5) and the market is exhausted
    assert.equal(s.status, 'finished');
    assert.equal(s.result?.reason, 'market-exhausted');
    assert.equal(total(s, 'p1').points, 34);
    assert.equal(total(s, 'p2').points, 10);
    assert.deepEqual(total(s, 'p1').hand.map((h) => h.value), [2, 12, 20]);
    assert.deepEqual(total(s, 'p2').hand.map((h) => h.value), [1, 4, 5]);
    assert.deepEqual(s.result!.winnerIds, ['p2'], 'the LOWEST total wins');
    assert.equal(total(s, 'p2').winner, true);
    assert.equal(total(s, 'p1').winner, false);
  });

  test('value totals decide the winner even when the holder has more cards', () => {
    const g = scenario({
      hands: [[c('circle', 14), c('circle', 12)], [c('cross', 1), c('cross', 2), c('cross', 3), c('cross', 5)]],
      top: c('circle', 7), market: [c('star', 1)], rules: { mode: 'count' },
    });
    const s = must(applyDraw(g, 'p1')).state; // p1: 14+12+1 = 27 ; p2: 1+2+3+5 = 11
    assert.equal(total(s, 'p1').points, 27);
    assert.equal(total(s, 'p2').points, 11);
    assert.equal(total(s, 'p2').cards, 4);
    assert.deepEqual(s.result?.winnerIds, ['p2'], 'p2 holds MORE cards but a LOWER total, so wins');
    assert.deepEqual(s.result?.ranking.map((r) => [r.playerId, r.rank]), [['p2', 1], ['p1', 2]]);
    assert.match(s.result!.explanation, /lowest total wins/i);
  });

  test('Whot counts 20; stars count face value unless starsCountDouble is on', () => {
    const mk = (r = {}) => {
      const g = scenario({ hands: [[whot(1), c('star', 8), c('cross', 3)], [c('circle', 1)]], top: c('circle', 7), market: [c('square', 5)], current: 1, rules: { mode: 'count', ...r } });
      return must(applyDraw(g, 'p2')).state;
    };
    assert.equal(total(mk(), 'p1').points, 20 + 8 + 3);
    assert.equal(total(mk({ starsCountDouble: true }), 'p1').points, 20 + 16 + 3);
    assert.equal(DEFAULT_RULES.starsCountDouble, false);
  });

  test('ties share the win consistently', () => {
    const g = scenario({
      hands: [[c('circle', 4), c('cross', 8)], [c('cross', 9), c('cross', 4)], [c('square', 6), c('square', 7)]],
      top: c('circle', 7), market: [c('star', 1)], rules: { mode: 'count' },
    });
    const s = must(applyDraw(g, 'p1')).state; // p1 12 + 1 = 13; p2 13; p3 13
    assert.deepEqual([...s.result!.winnerIds].sort(), ['p1', 'p2', 'p3']);
    assert.ok(s.result!.ranking.every((r) => r.rank === 1 && r.winner));
  });

  test('a player who goes out in Count mode ends the round with 0 and wins', () => {
    const g = scenario({ hands: [[c('circle', 4)], [c('cross', 9), c('cross', 3)]], top: c('circle', 7), rules: { mode: 'count' } });
    const s = must(applyPlay(g, 'p1', 'circle-4')).state;
    assert.equal(s.status, 'finished');
    assert.equal(s.result?.reason, 'out-of-cards');
    assert.deepEqual(s.result?.winnerIds, ['p1']);
    assert.equal(total(s, 'p1').points, 0);
    assert.equal(total(s, 'p2').points, 12);
  });

  test('market is never reshuffled in count mode; exhaustion ends the game even mid-penalty', () => {
    const g = scenario({ hands: [[c('circle', 5), c('circle', 4)], [c('cross', 9), c('cross', 3)]], top: c('circle', 7), market: [c('square', 100), c('square', 101)], rules: { mode: 'count' } });
    let s = must(applyPlay(g, 'p1', 'circle-5')).state;
    s = must(applyDraw(s, 'p2')).state; // owes 3, only 2 left
    assert.equal(s.status, 'finished');
    assert.equal(s.players[1].hand.length, 4);
    assert.equal(s.penalty, null);
    assert.equal(s.discard.length, 2, 'discard pile untouched');
  });

  test('General Market that empties the market ends the game', () => {
    const g = scenario({ hands: [[c('circle', 14), c('circle', 4), c('circle', 3)], [c('cross', 9)], [c('square', 4)]], top: c('circle', 7), market: [c('square', 100)], rules: { mode: 'count' } });
    const s = must(applyPlay(g, 'p1', 'circle-14')).state;
    assert.equal(s.status, 'finished');
    assert.equal(s.players[1].hand.length, 2);
    assert.equal(s.players[2].hand.length, 1, 'market ran out before the last player could draw');
  });

  test('scoring is computed on the server from hands (results carry the full breakdown)', () => {
    const g = scenario({ hands: [[c('circle', 4)], [c('cross', 9), whot(1)]], top: c('circle', 7), rules: { mode: 'rollover' } });
    const s = must(applyPlay(g, 'p1', 'circle-4')).state;
    const r = total(s, 'p2');
    assert.deepEqual(r.hand.map((h) => [h.card.id, h.value]), [['cross-9', 9], ['whot-1', 20]]);
    assert.equal(r.points, 29);
  });
});

describe('leaving players', () => {
  test('removing a non-current player keeps the turn on the same person', () => {
    const g = scenario({ hands: [[c('circle', 4)], [c('cross', 9)], [c('square', 4)]], top: c('circle', 7), current: 2 });
    const s = removePlayer(g, 'p1');
    assert.equal(currentPlayerId(s), 'p3');
    assert.equal(s.players.length, 2);
    assert.equal(s.market.length, g.market.length + 1, 'hand returns to the market');
  });

  test('removing the current player passes the turn on', () => {
    const g = scenario({ hands: [[c('circle', 4)], [c('cross', 9)], [c('square', 4)]], top: c('circle', 7), current: 1 });
    assert.equal(currentPlayerId(removePlayer(g, 'p2')), 'p3');
    const last = scenario({ hands: [[c('circle', 4)], [c('cross', 9)], [c('square', 4)]], top: c('circle', 7), current: 2 });
    assert.equal(currentPlayerId(removePlayer(last, 'p3')), 'p1');
  });

  test('last player standing wins by forfeit; penalty against a leaver is cleared', () => {
    const g = scenario({ hands: [[c('circle', 4)], [c('cross', 9)]], top: c('circle', 7) });
    const s = removePlayer(g, 'p2');
    assert.equal(s.status, 'finished');
    assert.deepEqual(s.result?.winnerIds, ['p1']);
    assert.equal(s.result?.reason, 'forfeit');
    const p = scenario({ hands: [[c('circle', 2), c('circle', 4)], [c('cross', 9)], [c('square', 4)]], top: c('circle', 7) });
    const pen = must(applyPlay(p, 'p1', 'circle-2')).state;
    assert.equal(removePlayer(pen, 'p2').penalty, null);
  });
});

describe('privacy: sanitized views', () => {
  test('a client never receives other hands, market contents or discard order', () => {
    const g = createGame(['a', 'b', 'c', 'd'], rules(), { rng: seeded(11) });
    const view = sanitizeGame(g, 'a');
    const json = JSON.stringify(view);
    for (const p of g.players.filter((p) => p.id !== 'a')) {
      for (const card of p.hand) assert.ok(!json.includes(`"${card.id}"`), `leaked ${card.id}`);
    }
    for (const card of g.market) assert.ok(!json.includes(`"${card.id}"`), `leaked market ${card.id}`);
    assert.equal(view.you.hand.length, 5);
    assert.equal(view.marketCount, g.market.length);
    assert.deepEqual(view.seats.map((s) => s.handCount), [5, 5, 5, 5]);
    assert.ok(!('market' in view) && !('players' in view) && !('discard' in view));
  });

  test('playable ids and draw permission only apply on your turn', () => {
    const g = createGame(['a', 'b'], rules(), { rng: seeded(5) });
    assert.equal(sanitizeGame(g, 'b').you.canDraw, false);
    assert.deepEqual(sanitizeGame(g, 'b').you.playableCardIds, []);
    assert.equal(sanitizeGame(g, 'a').you.canDraw, true);
  });
});

describe('rule validation', () => {
  test('defaults, accepted overrides and rejected garbage', () => {
    assert.deepEqual((normalizeRules(undefined) as any).rules, DEFAULT_RULES);
    const ok = normalizeRules({ mode: 'count', starsCountDouble: true, fivePenalty: 5 }) as any;
    assert.equal(ok.rules.mode, 'count');
    assert.equal(ok.rules.fivePenalty, 5);
    for (const bad of [{ mode: 'x' }, { cardsPerPlayer: 99 }, { defence: 'yes' }, [], 'str', { fivePenalty: 4 }]) {
      assert.equal(normalizeRules(bad).ok, false, JSON.stringify(bad));
    }
  });
});

describe('full simulated games', () => {
  for (const n of [2, 3, 4]) {
    for (const mode of ['rollover', 'count'] as const) {
      test(`${n} players, ${mode}: random legal play always terminates with a result`, () => {
        const rng = seeded(100 + n);
        const ids = Array.from({ length: n }, (_, i) => `p${i}`);
        let s = createGame(ids, rules({ mode, cardsPerPlayer: 5 }), { rng });
        let guard = 0;
        while (s.status === 'playing' && guard++ < 50000) {
          const id = currentPlayerId(s);
          const options = playableCards(s, id);
          let next;
          if (options.length && rng(25) !== 0) {
            const card = options[rng(options.length)];
            next = applyPlay(s, id, card.id, { calledShape: (['circle', 'triangle', 'cross', 'square', 'star'] as const)[rng(5)] });
          } else {
            next = applyDraw(s, id);
          }
          assert.ok(next.ok, JSON.stringify(next));
          s = next.state;
          const total = s.players.reduce((a, p) => a + p.hand.length, 0) + s.market.length + s.discard.length;
          assert.equal(total, 54, 'cards are conserved');
        }
        assert.equal(s.status, 'finished');
        assert.ok(s.result && s.result.winnerIds.length >= 1);
      });
    }
  }
});
