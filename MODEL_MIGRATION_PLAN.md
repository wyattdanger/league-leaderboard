# Model Migration Plan

## Goal
Create a complete abstraction layer between the tournament platform (Melee.gg) and the rest of the codebase. All platform-specific logic should be encapsulated within model classes, making the views and business logic platform-agnostic.

## Design Principles
1. **Single Source of Truth**: Each model has ONE factory method that knows about Melee.gg structure
2. **Fail-Fast**: Models validate data on construction and throw clear errors
3. **Immutable**: All model properties are readonly
4. **Self-Contained**: Models contain all display logic (formatting, CSS classes, etc.)
5. **Platform Agnostic**: Code outside models should never reference Melee-specific fields

## Proposed Models

### ✅ 1. Player Model (COMPLETED)
**Status**: Already implemented
**Purpose**: Encapsulates player identity and display information
**Key Features**:
- Cleans display names (removes emojis)
- Provides stable username identifier
- Factory methods for different data sources

### 🚧 2. Standing Model (IN PROGRESS)
**Status**: Just created, needs integration
**Purpose**: Represents a player's tournament standing
**Key Features**:
- Match and game records
- Win percentage calculations
- Display formatting (records, percentages)
- CSS class generation for styling
- Perfect record detection

### 📋 3. Match Model (PLANNED)
**Purpose**: Represents a single match/pairing
**Key Features**:
- Player references (nullable for byes)
- Game scores
- Bye detection
- Winner determination
- Draw detection
- Display ordering logic (winner on left)

**Proposed Interface**:
```typescript
class Match {
  round: number
  player1: Player | null
  player2: Player | null
  player1Games: number
  player2Games: number
  gameDraws: number

  get isBye(): boolean
  get winner(): Player | null
  get isDraw(): boolean
  get isComplete(): boolean
  static fromMeleeMatch(data: MeleeMatch): Match
}
```

### 📋 4. Round Model (PLANNED)
**Purpose**: Represents a tournament round
**Key Features**:
- Round number
- Collection of matches
- Sorting logic (byes last)

**Proposed Interface**:
```typescript
class Round {
  number: number
  matches: Match[]

  get regularMatches(): Match[]
  get byeMatches(): Match[]
  static fromMeleeRound(data: MeleeRound): Round
}
```

### 📋 5. Tournament Model (PLANNED)
**Purpose**: Represents an entire tournament
**Key Features**:
- Metadata (date, player count, etc.)
- Final standings
- All rounds
- Trophy/belt winner detection
- Top finisher identification

**Proposed Interface**:
```typescript
class Tournament {
  id: string
  date: Date
  name: string
  standings: Standing[]
  rounds: Round[]

  get playerCount(): number
  get roundCount(): number
  get trophyWinners(): Player[]
  get topFinishers(): Player[]
  get isTop8(): boolean
  get champion(): Player | null
  static fromMeleeData(id: string, metadata: any, standings: any[], rounds: any[]): Tournament
}
```

### 📋 6. DeckAssignment Model (PLANNED)
**Purpose**: Maps players to their deck choices
**Key Features**:
- Player-deck associations
- Completeness checking
- Metagame breakdown calculation

**Proposed Interface**:
```typescript
class DeckAssignment {
  player: Player
  deckName: string

  static fromDeckData(username: string, deckName: string): DeckAssignment
}

class DeckCollection {
  assignments: Map<string, DeckAssignment>

  get isComplete(): boolean
  get metagameBreakdown(): MetagameBreakdown[]
  getDeckForPlayer(player: Player): string | null
}
```

### 📋 7. LeagueStanding Model (PLANNED)
**Purpose**: Represents aggregated standings across multiple tournaments
**Key Features**:
- Player stats aggregation
- League points calculation
- Trophy/belt counting
- Head-to-head records

**Proposed Interface**:
```typescript
class LeagueStanding {
  player: Player
  tournaments: TournamentResult[]
  totalPoints: number
  trophies: number
  belts: number

  get matchRecord(): string
  get gameRecord(): string
  get averageFinish(): number
  static fromAggregatedData(data: any): LeagueStanding
}
```

### 📋 8. PlayerProfile Model (PLANNED)
**Purpose**: Complete player statistics and history
**Key Features**:
- Overall statistics
- Per-league breakdowns
- Head-to-head records
- Tournament history
- Recent performance

**Proposed Interface**:
```typescript
class PlayerProfile {
  player: Player
  overallStats: PlayerStats
  leagueStats: Map<string, PlayerStats>
  headToHeadRecords: Map<string, HeadToHeadRecord>
  tournamentHistory: TournamentResult[]

  static fromPlayerData(data: any): PlayerProfile
}
```

## Migration Strategy

### Phase 1: Core Models (Current)
1. ✅ Player model
2. 🚧 Standing model
3. Match model
4. Round model

### Phase 2: Tournament Layer
1. Tournament model
2. DeckAssignment/DeckCollection models
3. Update event pages to use models

### Phase 3: League Layer
1. LeagueStanding model
2. Update league pages to use models

### Phase 4: Player Profiles
1. PlayerProfile model
2. Update player pages to use models

### Phase 5: Cleanup
1. Remove all direct Melee.gg references from views
2. Move all formatting logic into models
3. Update tests to work with models
4. Document model API

## Benefits of This Architecture

1. **Platform Independence**: Switching from Melee.gg would only require updating factory methods
2. **Testability**: Models can be unit tested without mocking API responses
3. **Type Safety**: Strong typing throughout the application
4. **Maintainability**: Business logic centralized in models
5. **Consistency**: Display formatting standardized across views
6. **Performance**: Models can cache calculated values
7. **Debugging**: Clear error messages when data is invalid

## Implementation Notes

- Each model should have comprehensive JSDoc comments
- Factory methods should validate all required data
- Use TypeScript's `readonly` modifier for all properties
- Prefer getters over methods for computed properties
- Include display-specific logic (CSS classes, formatting) in models
- Models should be pure TypeScript with no framework dependencies

## Success Criteria

- [ ] No Melee.gg specific types imported in `.astro` files
- [ ] All data transformation logic moved to models
- [ ] Views only call model methods/properties
- [ ] All formatting logic centralized in models
- [ ] Tests updated to work with model layer
- [ ] Documentation updated to reflect new architecture