import type {
  Checklist,
  Comment,
  EngineerDetail,
  EngineerProfile,
  EngineersQuery,
  EngineerSummary,
  MyEngineer,
  Message,
  Order,
  OrderAction,
  OrderDetail,
  OrdersQuery,
  OrderView,
  PortfolioTrack,
  Profile,
  Project,
  ProjectDetail,
  ProjectsQuery,
  ProjectSummary,
  Review,
  Session,
  User,
  Version,
} from '../types/domain';
import type {
  CommentInput,
  EngineerInput,
  LoginInput,
  MessageInput,
  OrderInput,
  ProjectInput,
  RegisterInput,
  ReviewInput,
  TrackInput,
} from '../lib/schemas';

export interface AudioAnalysis {
  durationSec: number;
  peaks: number[];
  lufs: number;
  peakDb: number;
}

export interface NewVersionInput {
  file: Blob;
  fileName: string;
  note: string;
  analysis: AudioAnalysis;
}

export interface NewTrackInput extends TrackInput {
  file: Blob;
  fileName: string;
  analysis: AudioAnalysis;
}

export interface MixbackApi {
  auth: {
    register(input: RegisterInput): Promise<Session>;
    login(input: LoginInput): Promise<Session>;
    logout(): Promise<void>;
    me(): Promise<User | null>;
    profile(): Promise<Profile>;
    updateProfile(input: { name: string }): Promise<User>;
    changePassword(input: { currentPassword: string; newPassword: string }): Promise<Session>;
    deleteAccount(input: { password: string }): Promise<void>;
  };
  projects: {
    list(query: ProjectsQuery): Promise<ProjectSummary[]>;
    get(id: string): Promise<ProjectDetail>;
    create(input: Omit<ProjectInput, 'status'>): Promise<Project>;
    update(id: string, patch: Partial<ProjectInput>): Promise<Project>;
    remove(id: string): Promise<void>;
    invite(id: string, email: string): Promise<ProjectDetail['members']>;
  };
  versions: {
    create(projectId: string, input: NewVersionInput): Promise<Version>;
    audioUrl(file: Pick<Version, 'id' | 'fileUrl'>): Promise<string>;
  };
  comments: {
    list(versionId: string): Promise<Comment[]>;
    create(versionId: string, input: CommentInput): Promise<Comment>;
    update(id: string, patch: Partial<Pick<Comment, 'text' | 'resolved'>>): Promise<Comment>;
    remove(id: string): Promise<void>;
  };
  checklist: {
    get(versionId: string): Promise<Checklist | null>;
    generate(versionId: string): Promise<Checklist>;
    toggle(versionId: string, itemId: string, done: boolean): Promise<Checklist>;
  };
  engineers: {
    list(query: EngineersQuery): Promise<EngineerSummary[]>;
    get(userId: string): Promise<EngineerDetail>;
    mine(): Promise<MyEngineer | null>;
    save(input: EngineerInput): Promise<EngineerProfile>;
    count(): Promise<number>;
    setCover(image: Blob | null): Promise<EngineerProfile>;
    addTrack(input: NewTrackInput): Promise<PortfolioTrack>;
    removeTrack(id: string): Promise<void>;
  };
  orders: {
    list(query: OrdersQuery): Promise<OrderView[]>;
    get(id: string): Promise<OrderDetail>;
    create(input: OrderInput): Promise<Order>;
    act(id: string, action: OrderAction): Promise<OrderDetail>;
    review(id: string, input: ReviewInput): Promise<Review>;
  };
  messages: {
    list(orderId: string): Promise<Message[]>;
    send(orderId: string, input: MessageInput): Promise<Message>;
  };
}
