import type { RuleConfig } from '../../lib/game/types.ts';
import { describeRules } from '../../lib/game/rules.ts';
import { Badge } from '../ui/badge.tsx';
import { Segmented } from '../ui/segmented.tsx';
import { SettingRow } from '../ui/setting-row.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs.tsx';

interface Props {
  rules: RuleConfig;
  maxPlayers: number;
  readOnly?: boolean;
  onRules: (patch: Partial<RuleConfig>) => void;
  onMaxPlayers: (n: 2 | 3 | 4) => void;
}

/** Shared by Create Room (editable) and Lobby (editable for host, read-only for guests). */
export function GameSettings({ rules, maxPlayers, readOnly, onRules, onMaxPlayers }: Props) {
  const ro = Boolean(readOnly);
  const count = rules.mode === 'count';
  const noDefence = ro || !rules.defence;
  return (
    <div className="grid gap-4">
      <Tabs defaultValue="basics">
        <TabsList aria-label="Setting groups">
          <TabsTrigger value="basics">Basics</TabsTrigger>
          <TabsTrigger value="penalties">Penalties</TabsTrigger>
          <TabsTrigger value="house">House rules</TabsTrigger>
        </TabsList>

        <TabsContent value="basics" className="grid gap-5">
          <Segmented label="Players" value={maxPlayers} disabled={ro} options={[2, 3, 4].map((n) => ({ value: n, label: String(n) }))} onChange={(n) => onMaxPlayers(n as 2 | 3 | 4)} />
          <Segmented
            label="Game mode"
            value={rules.mode}
            disabled={ro}
            hint={count ? 'Round ends when someone goes out or the market runs out. Add up your card values: lowest total wins.' : 'Round ends when someone plays their last card.'}
            options={[{ value: 'rollover', label: 'Rollover' }, { value: 'count', label: 'Count' }]}
            onChange={(mode) => onRules({ mode })}
          />
          <Segmented label="Cards dealt to each player" value={rules.cardsPerPlayer} disabled={ro} options={[3, 4, 5, 6, 7].map((n) => ({ value: n, label: String(n) }))} onChange={(cardsPerPlayer) => onRules({ cardsPerPlayer })} />
        </TabsContent>

        <TabsContent value="penalties" className="grid gap-4">
          <SettingRow label="Allow defence" hint="Answer a Pick card with a permitted card instead of drawing." checked={rules.defence} disabled={ro} onChange={(defence) => onRules({ defence })} />
          <SettingRow label="Stack penalties" hint="Each defence adds to the penalty. Off: a defence passes the same penalty on." checked={rules.stacking} disabled={noDefence} onChange={(stacking) => onRules({ stacking })} />
          <Segmented label="A 2 can answer…" value={rules.pick2Counters} disabled={noDefence} options={[{ value: 'same-only', label: 'Pick 2 only' }, { value: 'any-penalty', label: 'Any penalty' }]} onChange={(pick2Counters) => onRules({ pick2Counters })} />
          <Segmented label="A 5 can answer…" value={rules.pick5Counters} disabled={noDefence} options={[{ value: 'same-only', label: 'Its own penalty only' }, { value: 'any-penalty', label: 'Any penalty' }]} onChange={(pick5Counters) => onRules({ pick5Counters })} />
          <Segmented label="5-card penalty" value={rules.fivePenalty} disabled={ro} hint="Traditional Nigerian Whot is Pick 3." options={[{ value: 3, label: 'Pick 3 (traditional)' }, { value: 5, label: 'Pick 5' }]} onChange={(fivePenalty) => onRules({ fivePenalty })} />
        </TabsContent>

        <TabsContent value="house" className="grid gap-3">
          <SettingRow label="8 suspends the next player" checked={rules.suspension8} disabled={ro} onChange={(suspension8) => onRules({ suspension8 })} />
          <SettingRow label="General Market player plays again" checked={rules.generalMarketPlaysAgain} disabled={ro} onChange={(generalMarketPlaysAgain) => onRules({ generalMarketPlaysAgain })} />
          <SettingRow label="Pick cards may reverse direction" checked={rules.directionChange} disabled={ro} onChange={(directionChange) => onRules({ directionChange })} />
          <SettingRow label="Allow finishing on a special card" checked={rules.finishOnSpecial} disabled={ro} onChange={(finishOnSpecial) => onRules({ finishOnSpecial })} />
          <SettingRow label="Stars count double when scoring" hint="Off: every card scores its printed number (Whot = 20)." checked={rules.starsCountDouble} disabled={ro} onChange={(starsCountDouble) => onRules({ starsCountDouble })} />
        </TabsContent>
      </Tabs>

      <section aria-label="Rules summary" className="rounded-xl border border-maroon-light/30 bg-maroon/15 p-3.5">
        <h3 className="mb-2 text-sm font-semibold text-cream">Rules summary</h3>
        <ul className="flex flex-wrap gap-1.5">
          {describeRules(rules).map((line) => (
            <li key={line}>
              <Badge variant="secondary" className="h-auto whitespace-normal py-1 text-left font-normal">
                {line}
              </Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
