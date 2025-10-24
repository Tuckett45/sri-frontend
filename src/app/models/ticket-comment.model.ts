import { PunchListImages } from './punch-list-images.model';

export enum CommentType {
  GENERAL = 'General',
  STATUS_CHANGE = 'Status Change',
  ASSIGNMENT = 'Assignment',
  ESCALATION = 'Escalation',
  RESOLUTION = 'Resolution',
  SYSTEM = 'System'
}

export enum CommentVisibility {
  PUBLIC = 'Public',
  INTERNAL = 'Internal',
  VENDOR_ONLY = 'Vendor Only',
  ADMIN_ONLY = 'Admin Only'
}

export class TicketComment {
  id: string;
  ticketId: string;
  parentCommentId?: string; // For threaded comments
  
  // Content
  content: string;
  type: CommentType;
  visibility: CommentVisibility;
  
  // Author information
  authorId: string;
  authorName: string;
  authorRole: string;
  
  // Timestamps
  createdDate: Date;
  updatedDate?: Date;
  
  // Attachments
  attachments: PunchListImages[];
  
  // Metadata
  isEdited: boolean;
  isDeleted: boolean;
  editedBy?: string;
  editedDate?: Date;
  
  // System-generated comment data
  systemData?: {
    oldValue?: any;
    newValue?: any;
    fieldName?: string;
    action?: string;
  };

  constructor(
    id: string,
    ticketId: string,
    content: string,
    authorId: string,
    authorName: string,
    authorRole: string,
    type: CommentType = CommentType.GENERAL,
    visibility: CommentVisibility = CommentVisibility.PUBLIC,
    parentCommentId?: string
  ) {
    this.id = id;
    this.ticketId = ticketId;
    this.parentCommentId = parentCommentId;
    this.content = content;
    this.type = type;
    this.visibility = visibility;
    this.authorId = authorId;
    this.authorName = authorName;
    this.authorRole = authorRole;
    this.createdDate = new Date();
    this.attachments = [];
    this.isEdited = false;
    this.isDeleted = false;
  }

  // Helper methods
  canEdit(userId: string, userRole: string): boolean {
    // Author can edit their own comments within 24 hours
    if (this.authorId === userId) {
      const hoursSinceCreated = (new Date().getTime() - this.createdDate.getTime()) / (1000 * 60 * 60);
      return hoursSinceCreated < 24 && !this.isDeleted;
    }
    
    // Admins can edit any comment
    return userRole === 'Admin';
  }

  canDelete(userId: string, userRole: string): boolean {
    // Author can delete their own comments
    if (this.authorId === userId && !this.isDeleted) {
      return true;
    }
    
    // Admins can delete any comment
    return userRole === 'Admin';
  }

  canView(userId: string, userRole: string, userVendor?: string): boolean {
    if (this.isDeleted) return false;
    
    switch (this.visibility) {
      case CommentVisibility.PUBLIC:
        return true;
      case CommentVisibility.INTERNAL:
        return !userRole.includes('Client') && !userRole.includes('Vendor');
      case CommentVisibility.VENDOR_ONLY:
        return userRole.includes('Vendor') || userRole === 'Admin' || userRole === 'PM' || userRole === 'CM';
      case CommentVisibility.ADMIN_ONLY:
        return userRole === 'Admin';
      default:
        return false;
    }
  }

  markAsEdited(editedBy: string): void {
    this.isEdited = true;
    this.editedBy = editedBy;
    this.editedDate = new Date();
    this.updatedDate = new Date();
  }

  markAsDeleted(): void {
    this.isDeleted = true;
    this.content = '[Comment deleted]';
    this.updatedDate = new Date();
  }
}

// Comment thread structure for nested comments
export interface CommentThread {
  comment: TicketComment;
  replies: CommentThread[];
  replyCount: number;
}

// Comment statistics for reporting
export interface CommentStats {
  totalComments: number;
  commentsByType: { [key in CommentType]: number };
  commentsByVisibility: { [key in CommentVisibility]: number };
  averageCommentsPerTicket: number;
  mostActiveCommenters: {
    userId: string;
    userName: string;
    commentCount: number;
  }[];
}

