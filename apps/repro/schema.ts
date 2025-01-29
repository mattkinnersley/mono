import {
  createSchema,
  table,
  relationships,
  definePermissions,
  type ExpressionBuilder,
  type Row,
  NOBODY_CAN,
  json,
  string,
  number,
  boolean,
} from "@rocicorp/zero";


const user = table("user")
  .columns({
    id: string(),
    email: string()
  })
  .primaryKey("id")

const artist = table("artist")
  .columns({
    id: string(),
    name: string()
  })
  .primaryKey("id")

const recordingSetArtist = table("recording_set_artist")
  .columns({
    id: string(),
    recording_set_id: string(),
    artist_id: string()
  })
  .primaryKey("id")

const recordingSet = table("recording_set")
  .columns({
    id: string(),
    started_at: number(),
    ended_at: number(),
    location_id: string(),
    short_id: string(),
    duration: number()
  })
  .primaryKey("id")

const location = table("location")
  .columns({
    id: string(),
    name: string(),
    code: string(),
    short_id: string(),
    workspace_id: string(),
  })
  .primaryKey("id")


const workspace = table("workspace")
  .columns({
    id: string(),
    name: string(),
    type: string()
  })
  .primaryKey("id")

const userWorkspace = table("user_workspace")
  .columns({
    id: string(),
    user_id: string(),
    workspace_id: string(),
  })
  .primaryKey("id")

const recorderSoundcard = table("recorder_soundcard")
  .columns({
    id: string(),
    recorder_id: string(),
    model: string(),
    serial_number: string(),
    is_connected: boolean()
  })
  .primaryKey("id")

const recorderConfig = table("recorder_config")
  .columns({
    id: string(),
    location_id: string(),
    recording_channels: number(),
    recording_sample_rate: number(),
    recording_bit_depth: number(),
    recording_schedule: json<
      {
        rec_start: string;
        rec_end: string;
        dayofweek?: string;
        date?: string;  // overrides default schedule for certain dates
        display_name?: string;  // "default" marks the usual schedule; Special dates will have different display_name e.g. "New Year"
        no_gig?: boolean;
      }[]
    >()
  })
  .primaryKey("id")

const recorderStatus = table("recorder_status")
  .columns({
    id: string(),
    recorder_id: string(),
    last_connected_at: number(),
    is_online: boolean(),
    next_recording_at: number(),
    is_in_recording_window: boolean(),
    thing_group: string(),
    software_version: string(),
    wifi_name: string(),
    is_wifi_connected: boolean(),
    is_ethernet_connected: boolean()
  })
  .primaryKey("id")

const recordingSetPurchase = table("recording_set_purchase")
  .columns({
    id: string(),
    artist_id: string(),
    is_completed: boolean(),
    recording_set_id: string(),
    location_id: string(),
    price: number(),
    currency: string(),
    transfer_fee: string(),
    vat_tax: string(),
    post_tax_amount: string(),
    venue_royalty: string(),
    created_at: number()
  })
  .primaryKey("id")



const recorderSoundcardRelationships = relationships(recorderSoundcard, ({ many }) => ({
  workspaceUsers: many(
    {
      sourceField: ['recorder_id'],
      destField: ['id'],
      destSchema: location,
    },
    {
      sourceField: ['workspace_id'],
      destField: ['workspace_id'],
      destSchema: userWorkspace,
    }
  ),
}));

const userWorkspaceRelationships = relationships(userWorkspace, ({ one }) => ({
  user: one({
    sourceField: ['user_id'],
    destField: ['id'],
    destSchema: user,
  }),
  workspace: one({
    sourceField: ['workspace_id'],
    destField: ['id'],
    destSchema: workspace,
  }),
}));

const recordingSetRelationships = relationships(recordingSet, ({ many, one }) => ({
  artists: many(
    {
      sourceField: ['id'],
      destField: ['recording_set_id'],
      destSchema: recordingSetArtist
    },
    {
      sourceField: ['artist_id'],
      destField: ['id'],
      destSchema: artist
    }
  ),
  location: one({
    sourceField: ['location_id'],
    destField: ['id'],
    destSchema: location
  }),
  workspaceUsers: many(
    {
      sourceField: ['location_id'],
      destField: ['id'],
      destSchema: location,
    },
    {
      sourceField: ['workspace_id'],
      destField: ['workspace_id'],
      destSchema: userWorkspace,
    }
  ),
  soundcards: many({
    sourceField: ["id"],
    destField: ["recorder_id"],
    destSchema: recorderSoundcard
  })
}));

const workspaceRelationships = relationships(workspace, ({ many }) => ({
  workspaceUsers: many(
    {
      sourceField: ['id'],
      destField: ['workspace_id'],
      destSchema: userWorkspace,
    },
  ),
}));

const locationRelationships = relationships(location, ({ many }) => ({
  workspaceUsers: many(
    {
      sourceField: ['workspace_id'],
      destField: ['workspace_id'],
      destSchema: userWorkspace,
    },
  ),
  soundcards: many({
    sourceField: ["id"],
    destField: ["recorder_id"],
    destSchema: recorderSoundcard
  })
}));

const artistRelationships = relationships(artist, ({ many }) => ({
  recordingSets: many(
    {
      sourceField: ['id'],
      destField: ['artist_id'],
      destSchema: recordingSetArtist,
    },
    {
      sourceField: ['recording_set_id'],
      destField: ['id'],
      destSchema: recordingSet,
    },
  ),
}));

const recordingSetArtistRelationships = relationships(recordingSetArtist, ({ one }) => ({
  artist: one({
    sourceField: ['artist_id'],
    destField: ['id'],
    destSchema: artist,
  }),
  recordingSet: one({
    sourceField: ['recording_set_id'],
    destField: ['id'],
    destSchema: recordingSet,
  }),
}));
const recorderConfigRelationships = relationships(recorderConfig, ({ one }) => ({
  recorder: one({
    sourceField: ['location_id'],
    destField: ['id'],
    destSchema: location
  })
}))
const recorderStatusRelationships = relationships(recorderStatus, ({ one }) => ({
  recorder: one({
    sourceField: ['recorder_id'],
    destField: ['id'],
    destSchema: location
  })
}))
const recordingSetPurchaseRelationships = relationships(recordingSetPurchase, ({ one, many }) => ({
  artist: one({
    sourceField: ['artist_id'],
    destField: ['id'],
    destSchema: artist
  }),
  recordingSet: one({
    sourceField: ['recording_set_id'],
    destField: ['id'],
    destSchema: recordingSet
  }),
  recorder: one({
    sourceField: ['location_id'],
    destField: ['id'],
    destSchema: location
  }),
  workspaceUsers: many(
    {
      sourceField: ['location_id'],
      destField: ['id'],
      destSchema: location
    },
    {
      sourceField: ['workspace_id'],
      destField: ['workspace_id'],
      destSchema: userWorkspace
    }
  )
}))


export const schema = createSchema(1, {
  tables: [
    user,
    artist,
    location,
    workspace,
    recordingSet,
    recordingSetArtist,
    userWorkspace,
    recordingSetPurchase,
    recorderConfig,
    recorderStatus,
    recorderSoundcard
  ],
  relationships: [
    recorderStatusRelationships,
    recorderConfigRelationships,
    artistRelationships,
    recordingSetPurchaseRelationships,
    recordingSetArtistRelationships,
    locationRelationships,
    workspaceRelationships,
    recordingSetRelationships,
    userWorkspaceRelationships,
    recorderSoundcardRelationships
  ]
}
)

export type Schema = typeof schema;
type TableName = keyof Schema['tables'];

export type RecordingSet = Row<typeof schema.tables.recording_set>;
export type Artist = Row<typeof schema.tables.artist>;
export type User = Row<typeof schema.tables.user>;
export type Workspace = Row<typeof schema.tables.workspace>;

type AuthData = {
  properties: {
    id: string,
    email: string
  };
  sub: string
};

export const permissions = definePermissions<AuthData, Schema>(schema, () => {
  const userIsLoggedIn = (
    authData: AuthData,
    { cmpLit }: ExpressionBuilder<Schema, TableName>,
  ) => cmpLit(authData.sub, 'IS NOT', null);

  const userMemberOfWorkspace = (
    authData: AuthData,
    eb: ExpressionBuilder<Schema, 'recording_set' | 'workspace'>,
  ) =>
    eb.exists('workspaceUsers', iq =>
      iq.where((eb: ExpressionBuilder<Schema, 'user_workspace'>) => eb.cmp('user_id', '=', '018d36bd-4f47-731f-b132-34c5e331b3b0')))


  const allowIfMemberOfWorkspace = (
    authData: AuthData,
    eb: ExpressionBuilder<Schema, 'recording_set' | 'workspace'>,
  ) => {
    return userMemberOfWorkspace(authData, eb)
  }

  return {
    recording_set: {
      row: {
        select: [allowIfMemberOfWorkspace],
        insert: NOBODY_CAN,
        update: {
          preMutation: NOBODY_CAN
        },
        delete: NOBODY_CAN
      },
    },
    user: {
      row: {
        insert: NOBODY_CAN,
        update: {
          preMutation: NOBODY_CAN
        },
        delete: NOBODY_CAN
      }
    },
    workspace: {
      row: {
        select: [allowIfMemberOfWorkspace],
        insert: NOBODY_CAN,
        update: {
          preMutation: NOBODY_CAN
        },
        delete: NOBODY_CAN
      }
    },
    location: {
      row: {
        insert: NOBODY_CAN,
        update: {
          preMutation: NOBODY_CAN
        },
        delete: NOBODY_CAN
      }
    },
    user_workspace: {
      row: {
        insert: NOBODY_CAN,
        update: {
          preMutation: NOBODY_CAN
        },
        delete: NOBODY_CAN
      }
    },
    artist: {
      row: {
        insert: NOBODY_CAN,
        update: {
          preMutation: NOBODY_CAN
        },
        delete: NOBODY_CAN
      }
    },
    recording_set_artist: {
      row: {
        insert: NOBODY_CAN,
        update: {
          preMutation: NOBODY_CAN
        },
        delete: NOBODY_CAN
      }
    }
  };
});




