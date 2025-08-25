import { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Share2, Lock, Unlock, Users, BookOpen, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Collection {
  id: string;
  title: string;
  description: string;
  is_public: boolean;
  prompt_count: number;
  follower_count: number;
  created_at: string;
  user_id: string;
  username: string;
  tags: string[];
}

interface Prompt {
  id: string;
  title: string;
  content: string;
  tags: string[];
  username: string;
}

export function PromptCollection() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [collectionPrompts, setCollectionPrompts] = useState<Prompt[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const [newCollection, setNewCollection] = useState({
    title: '',
    description: '',
    is_public: true,
    tags: [] as string[]
  });

  useEffect(() => {
    if (user) {
      loadCollections();
    }
  }, [user]);

  const loadCollections = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('collections')
        .select(`
          *,
          profiles!collections_user_id_fkey(username)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedCollections = data?.map(collection => ({
        ...collection,
        username: collection.profiles?.username || 'Unknown'
      })) || [];

      setCollections(formattedCollections);
    } catch (error) {
      console.error('Error loading collections:', error);
      toast({
        description: 'Failed to load collections',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createCollection = async () => {
    if (!newCollection.title.trim()) {
      toast({
        description: 'Please enter a collection title',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('collections')
        .insert({
          title: newCollection.title.trim(),
          description: newCollection.description.trim(),
          is_public: newCollection.is_public,
          user_id: user?.id,
          tags: newCollection.tags
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        description: 'Collection created successfully!',
      });

      setNewCollection({ title: '', description: '', is_public: true, tags: [] });
      setShowCreateDialog(false);
      loadCollections();
    } catch (error) {
      console.error('Error creating collection:', error);
      toast({
        description: 'Failed to create collection',
        variant: 'destructive',
      });
    }
  };

  const updateCollection = async () => {
    if (!selectedCollection || !newCollection.title.trim()) return;

    try {
      const { error } = await supabase
        .from('collections')
        .update({
          title: newCollection.title.trim(),
          description: newCollection.description.trim(),
          is_public: newCollection.is_public,
          tags: newCollection.tags
        })
        .eq('id', selectedCollection.id);

      if (error) throw error;

      toast({
        description: 'Collection updated successfully!',
      });

      setShowEditDialog(false);
      setSelectedCollection(null);
      loadCollections();
    } catch (error) {
      console.error('Error updating collection:', error);
      toast({
        description: 'Failed to update collection',
        variant: 'destructive',
      });
    }
  };

  const deleteCollection = async (collectionId: string) => {
    try {
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', collectionId);

      if (error) throw error;

      toast({
        description: 'Collection deleted successfully!',
      });

      loadCollections();
    } catch (error) {
      console.error('Error deleting collection:', error);
      toast({
        description: 'Failed to delete collection',
        variant: 'destructive',
      });
    }
  };

  const loadCollectionPrompts = async (collectionId: string) => {
    try {
      const { data, error } = await supabase
        .from('collection_prompts')
        .select(`
          prompt_id,
          prompts!collection_prompts_prompt_id_fkey(
            id,
            title,
            content,
            tags,
            profiles!prompts_user_id_fkey(username)
          )
        `)
        .eq('collection_id', collectionId);

      if (error) throw error;

      const prompts = data?.map(item => ({
        id: item.prompts.id,
        title: item.prompts.title,
        content: item.prompts.content,
        tags: item.prompts.tags || [],
        username: item.prompts.profiles?.username || 'Unknown'
      })) || [];

      setCollectionPrompts(prompts);
    } catch (error) {
      console.error('Error loading collection prompts:', error);
    }
  };

  const addPromptToCollection = async (collectionId: string, promptId: string) => {
    try {
      const { error } = await supabase
        .from('collection_prompts')
        .insert({
          collection_id: collectionId,
          prompt_id: promptId
        });

      if (error) throw error;

      toast({
        description: 'Prompt added to collection!',
      });

      if (selectedCollection) {
        loadCollectionPrompts(selectedCollection.id);
      }
    } catch (error) {
      console.error('Error adding prompt to collection:', error);
      toast({
        description: 'Failed to add prompt to collection',
        variant: 'destructive',
      });
    }
  };

  const removePromptFromCollection = async (collectionId: string, promptId: string) => {
    try {
      const { error } = await supabase
        .from('collection_prompts')
        .delete()
        .eq('collection_id', collectionId)
        .eq('prompt_id', promptId);

      if (error) throw error;

      toast({
        description: 'Prompt removed from collection!',
      });

      if (selectedCollection) {
        loadCollectionPrompts(selectedCollection.id);
      }
    } catch (error) {
      console.error('Error removing prompt from collection:', error);
      toast({
        description: 'Failed to remove prompt from collection',
        variant: 'destructive',
      });
    }
  };

  const handleEditCollection = (collection: Collection) => {
    setSelectedCollection(collection);
    setNewCollection({
      title: collection.title,
      description: collection.description,
      is_public: collection.is_public,
      tags: collection.tags || []
    });
    setShowEditDialog(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-2xl text-foreground">My Collections</h2>
          <Button disabled className="animate-pulse">
            <Plus className="h-4 w-4 mr-2" />
            Create Collection
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-32 mb-2"></div>
                <div className="h-3 bg-muted rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded mb-2"></div>
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-4 bg-muted rounded w-20"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl text-foreground">My Collections</h2>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Collection
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Collection</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newCollection.title}
                  onChange={(e) => setNewCollection({ ...newCollection, title: e.target.value })}
                  placeholder="Enter collection title"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newCollection.description}
                  onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })}
                  placeholder="Describe your collection"
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Visibility</label>
                <Select
                  value={newCollection.is_public ? 'public' : 'private'}
                  onValueChange={(value) => setNewCollection({ ...newCollection, is_public: value === 'public' })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createCollection}>Create</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {collections.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No collections yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first collection to organize and share your favorite prompts
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Collection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => (
            <Card key={collection.id} className="bg-card border-border hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-medium text-foreground mb-1">
                      {collection.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground line-clamp-2">
                      {collection.description || 'No description'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    {collection.is_public ? (
                      <Unlock className="h-4 w-4 text-green-500" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {collection.tags?.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {collection.tags && collection.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{collection.tags.length - 3}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                  <span className="flex items-center space-x-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{collection.prompt_count} prompts</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{collection.follower_count} followers</span>
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedCollection(collection);
                      loadCollectionPrompts(collection.id);
                    }}
                  >
                    View Prompts
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditCollection(collection)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteCollection(collection.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={newCollection.title}
                onChange={(e) => setNewCollection({ ...newCollection, title: e.target.value })}
                placeholder="Enter collection title"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newCollection.description}
                onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })}
                placeholder="Describe your collection"
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Visibility</label>
              <Select
                value={newCollection.is_public ? 'public' : 'private'}
                onValueChange={(value) => setNewCollection({ ...newCollection, is_public: value === 'public' })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={updateCollection}>Update</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedCollection && (
        <Dialog open={!!selectedCollection} onOpenChange={() => setSelectedCollection(null)}>
          <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>{selectedCollection.title}</span>
                <Badge variant={selectedCollection.is_public ? 'default' : 'secondary'}>
                  {selectedCollection.is_public ? 'Public' : 'Private'}
                </Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">{selectedCollection.description}</p>
              
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Prompts ({collectionPrompts.length})</h4>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Prompt
                </Button>
              </div>

              {collectionPrompts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No prompts in this collection yet
                </div>
              ) : (
                <div className="space-y-3">
                  {collectionPrompts.map((prompt) => (
                    <Card key={prompt.id} className="bg-muted/30">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium text-foreground mb-1">{prompt.title}</h5>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {prompt.content}
                            </p>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-muted-foreground">
                                by {prompt.username}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {prompt.tags.slice(0, 3).map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removePromptFromCollection(selectedCollection.id, prompt.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
