import { useState, useRef, useEffect } from 'react';
import { Send, User, Paperclip, AtSign, Smile, Clock, Edit, Trash2 } from 'lucide-react';

interface Comment {
  id: string;
  text: string;
  date: string;
  author: string;
  mentions: string[];
  attachments?: string[];
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

interface ProjectCommentsProps {
  comments: Comment[];
  team: TeamMember[];
  projectId: string;
  onAddComment?: (comment: string, attachments?: File[]) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
}

const ProjectComments: React.FC<ProjectCommentsProps> = ({ comments, team, projectId, onAddComment, onDeleteComment }) => {
  const [newComment, setNewComment] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFileUrls, setUploadedFileUrls] = useState<string[]>([]);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mentionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mentionMenuRef.current && !mentionMenuRef.current.contains(event.target as Node)) {
        setShowMentionMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewComment(value);
    
    // Check if we need to show the mention menu
    const lastChar = value.charAt(value.length - 1);
    const secondLastChar = value.charAt(value.length - 2);
    
    if (lastChar === '@' && (secondLastChar === ' ' || secondLastChar === '' || secondLastChar === '\n')) {
      // Position the mention menu
      if (commentInputRef.current) {
        const { selectionStart } = commentInputRef.current;
        const textBeforeCaret = value.substring(0, selectionStart);
        const lines = textBeforeCaret.split('\n');
        const currentLineIndex = lines.length - 1;
        const currentLine = lines[currentLineIndex];
        
        // Calculate position based on text metrics
        const lineHeight = 20; // Approximate line height
        const charWidth = 8; // Approximate character width
        
        setMentionPosition({
          top: (currentLineIndex + 1) * lineHeight,
          left: currentLine.length * charWidth
        });
      }
      
      setShowMentionMenu(true);
      setMentionFilter('');
    } else if (showMentionMenu) {
      // Check if we're still typing a mention
      const words = value.split(/\s+/);
      const lastWord = words[words.length - 1];
      
      if (lastWord.startsWith('@')) {
        setMentionFilter(lastWord.substring(1));
      } else {
        setShowMentionMenu(false);
      }
    }
  };

  const handleMentionSelect = (memberId: string, memberName: string) => {
    // Replace the @mention with the selected member
    const words = newComment.split(/\s+/);
    words[words.length - 1] = `@${memberName} `;
    setNewComment(words.join(' '));
    setShowMentionMenu(false);
    
    // Focus back on the input
    if (commentInputRef.current) {
      commentInputRef.current.focus();
    }
  };

  const handleSubmitComment = async () => {
    console.log('🔵 Send button clicked!');
    console.log('Comment text:', newComment);
    console.log('Files selected:', selectedFiles.length);
    
    if (!newComment.trim()) {
      console.log('⚠️ No comment text, returning');
      return;
    }
    
    if (!onAddComment) {
      console.error('❌ No onAddComment handler provided');
      return;
    }
    
    console.log('✅ Submitting comment with', selectedFiles.length, 'files');
    
    try {
      // Pass the comment and files to the parent handler
      await onAddComment(newComment.trim(), selectedFiles.length > 0 ? selectedFiles : undefined);
      
      console.log('✅ Comment submitted successfully, resetting form');
      
      // Reset form on successful submission
      setNewComment('');
      setSelectedFiles([]);
      setUploadedFileUrls([]);
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('❌ Error submitting comment:', error);
    }
  };

  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    console.log('📎 File input changed, files:', files);
    
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      console.log('📎 Converting to array:', fileArray);
      setSelectedFiles(fileArray);
      
      // Create preview URLs for images
      const urls = fileArray.map(file => URL.createObjectURL(file));
      setUploadedFileUrls(urls);
      
      console.log('✅ Files selected:', fileArray.length, 'files');
      console.log('File names:', fileArray.map(f => f.name));
      console.log('File sizes:', fileArray.map(f => f.size));
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingComment(comment.id);
    setEditText(comment.text);
  };

  const handleSaveEdit = (commentId: string) => {
    // In a real app, this would call an API to update the comment
    console.log('Saving edited comment:', commentId, editText);
    setEditingComment(null);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!onDeleteComment) {
      console.error('No onDeleteComment handler provided');
      return;
    }
    
    if (confirm('Are you sure you want to delete this comment?')) {
      try {
        await onDeleteComment(commentId);
        console.log('Comment deleted successfully');
      } catch (error) {
        console.error('Error deleting comment:', error);
      }
    }
  };

  const filteredTeamMembers = team.filter(member => 
    !mentionFilter || member.name.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  const formatCommentText = (text: string, mentions: string[]) => {
    let formattedText = text;
    
    // Replace @mentions with styled spans
    team.forEach(member => {
      if (mentions.includes(member.id)) {
        const regex = new RegExp(`@${member.name}\\b`, 'g');
        formattedText = formattedText.replace(regex, `<span class="text-blue-600 font-medium">@${member.name}</span>`);
      }
    });
    
    return formattedText;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Project Discussion</h3>
          <div className="mt-6 flow-root">
            <ul className="-mb-8">
              {comments.map((comment, commentIdx) => (
                <li key={comment.id}>
                  <div className="relative pb-8">
                    {commentIdx !== comments.length - 1 ? (
                      <span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                    ) : null}
                    <div className="relative flex items-start space-x-3">
                      <div className="relative">
                        {team.find(m => m.id === comment.author)?.avatar ? (
                          <img
                            className="h-10 w-10 rounded-full bg-gray-400 flex items-center justify-center ring-8 ring-white"
                            src={team.find(m => m.id === comment.author)?.avatar}
                            alt=""
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center ring-8 ring-white">
                            <User className="h-5 w-5 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div>
                          <div className="text-sm">
                            <a href="#" className="font-medium text-gray-900">
                              {team.find(m => m.id === comment.author)?.name}
                            </a>
                          </div>
                          <p className="mt-0.5 text-sm text-gray-500">
                            <Clock className="inline-block h-3 w-3 mr-1" />
                            {new Date(comment.date).toLocaleString()}
                          </p>
                        </div>
                        <div className="mt-2 text-sm text-gray-700">
                          {editingComment === comment.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                rows={3}
                              />
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => setEditingComment(null)}
                                  className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSaveEdit(comment.id)}
                                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p dangerouslySetInnerHTML={{ __html: formatCommentText(comment.text, comment.mentions) }}></p>
                              {comment.attachments && comment.attachments.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {comment.attachments.map((attachment, idx) => {
                                    const isImage = attachment.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                    return isImage ? (
                                      <img 
                                        key={idx} 
                                        src={attachment} 
                                        alt={`Attachment ${idx + 1}`}
                                        className="h-20 w-20 object-cover rounded cursor-pointer hover:opacity-75"
                                        onClick={() => window.open(attachment, '_blank')}
                                      />
                                    ) : (
                                      <a 
                                        key={idx}
                                        href={attachment}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center bg-gray-100 rounded px-2 py-1 text-xs hover:bg-gray-200"
                                      >
                                        <Paperclip className="h-3 w-3 mr-1" />
                                        Attachment {idx + 1}
                                      </a>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        {!editingComment && (
                          <div className="mt-2 flex space-x-2">
                            <button
                              onClick={() => handleEditComment(comment)}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              <Edit className="inline-block h-3 w-3 mr-1" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              <Trash2 className="inline-block h-3 w-3 mr-1" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="mt-6">
            <div className="relative">
              <textarea
                ref={commentInputRef}
                value={newComment}
                onChange={handleCommentChange}
                rows={3}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Add a comment..."
              ></textarea>
              
              {showMentionMenu && (
                <div 
                  ref={mentionMenuRef}
                  className="absolute z-10 mt-1 w-60 bg-white shadow-lg max-h-56 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
                  style={{ top: mentionPosition.top, left: mentionPosition.left }}
                >
                  {filteredTeamMembers.length === 0 ? (
                    <div className="py-2 px-4 text-sm text-gray-500">
                      No team members found
                    </div>
                  ) : (
                    filteredTeamMembers.map(member => (
                      <div
                        key={member.id}
                        className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100"
                        onClick={() => handleMentionSelect(member.id, member.name)}
                      >
                        <div className="flex items-center">
                          {member.avatar ? (
                            <img src={member.avatar} alt="" className="h-6 w-6 rounded-full mr-2" />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                              <User className="h-3 w-3 text-gray-500" />
                            </div>
                          )}
                          <span className="font-normal block truncate">{member.name}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            
            {/* Show selected files */}
            {selectedFiles.length > 0 && (
              <div className="mt-2 p-2 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600 mb-1">Attached files:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center bg-white border border-gray-200 rounded px-2 py-1 text-xs">
                      <Paperclip className="h-3 w-3 mr-1 text-gray-400" />
                      <span className="text-gray-700">{file.name}</span>
                      <button
                        onClick={() => {
                          const newFiles = selectedFiles.filter((_, i) => i !== index);
                          const newUrls = uploadedFileUrls.filter((_, i) => i !== index);
                          setSelectedFiles(newFiles);
                          setUploadedFileUrls(newUrls);
                        }}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-2">
              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={handleFileUpload}
                    className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Paperclip className="h-4 w-4 mr-1" />
                    Attach
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewComment(prev => prev + ' @')}
                    className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <AtSign className="h-4 w-4 mr-1" />
                    Mention
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    onChange={handleFileChange}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectComments;