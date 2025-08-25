import { useState, useRef, useEffect } from 'react';
import { Play, Square, Copy, Download, Settings, Zap, Clock, MessageSquare, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface TestResult {
  id: string;
  prompt: string;
  response: string;
  model: string;
  timestamp: string;
  parameters: {
    temperature: number;
    maxTokens: number;
    topP: number;
  };
  executionTime: number;
  tokenCount: number;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  maxTokens: number;
  costPer1kTokens: number;
  capabilities: string[];
}

const AI_MODELS: AIModel[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'OpenAI',
    maxTokens: 8192,
    costPer1kTokens: 0.03,
    capabilities: ['Creative Writing', 'Code Generation', 'Analysis', 'Conversation']
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    maxTokens: 4096,
    costPer1kTokens: 0.002,
    capabilities: ['General Purpose', 'Fast Response', 'Cost Effective']
  },
  {
    id: 'claude-3',
    name: 'Claude 3',
    provider: 'Anthropic',
    maxTokens: 100000,
    costPer1kTokens: 0.015,
    capabilities: ['Long Context', 'Analysis', 'Writing', 'Reasoning']
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'Google',
    maxTokens: 32768,
    costPer1kTokens: 0.001,
    capabilities: ['Multimodal', 'Code', 'Creative', 'Analysis']
  }
];

export function PromptTester() {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<AIModel>(AI_MODELS[0]);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [parameters, setParameters] = useState({
    temperature: 0.7,
    maxTokens: 1000,
    topP: 0.9,
    streamResponse: true
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const streamRef = useRef<NodeJS.Timeout | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadTestHistory();
  }, []);

  const loadTestHistory = async () => {
    try {
      const savedResults = localStorage.getItem('prompt-test-results');
      if (savedResults) {
        setTestResults(JSON.parse(savedResults));
      }
    } catch (error) {
      console.error('Error loading test history:', error);
    }
  };

  const saveTestHistory = (results: TestResult[]) => {
    try {
      localStorage.setItem('prompt-test-results', JSON.stringify(results));
    } catch (error) {
      console.error('Error saving test history:', error);
    }
  };

  const simulateAIResponse = async (promptText: string): Promise<string> => {
    const startTime = Date.now();
    
    const responses = [
      "This is a simulated AI response to demonstrate the prompt testing interface. The AI would analyze your prompt and generate a relevant, contextual response based on the parameters you've set.",
      "Based on your prompt, here's what the AI would generate: A comprehensive analysis that takes into account the context, tone, and specific requirements you've outlined.",
      "The AI model would process your input and produce a response that aligns with the temperature and creativity settings you've configured.",
      "This is a mock response showing how the AI would interpret and respond to your prompt with the current parameter settings."
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    if (parameters.streamResponse) {
      return new Promise((resolve) => {
        let currentText = '';
        const words = randomResponse.split(' ');
        let wordIndex = 0;
        
        setIsStreaming(true);
        
        const streamInterval = setInterval(() => {
          if (wordIndex < words.length) {
            currentText += (wordIndex > 0 ? ' ' : '') + words[wordIndex];
            setCurrentResponse(currentText);
            wordIndex++;
          } else {
            clearInterval(streamInterval);
            setIsStreaming(false);
            resolve(currentText);
          }
        }, 100);
        
        streamRef.current = streamInterval;
      });
    } else {
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      return randomResponse;
    }
  };

  const runTest = async () => {
    if (!prompt.trim()) {
      toast({
        description: 'Please enter a prompt to test',
        variant: 'destructive',
      });
      return;
    }

    if (!apiKey) {
      toast({
        description: 'Please configure your API key in settings',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    setCurrentResponse('');
    
    try {
      const startTime = Date.now();
      const response = await simulateAIResponse(prompt);
      const executionTime = Date.now() - startTime;
      
      const testResult: TestResult = {
        id: Date.now().toString(),
        prompt,
        response,
        model: selectedModel.name,
        timestamp: new Date().toISOString(),
        parameters: { ...parameters },
        executionTime,
        tokenCount: Math.ceil((prompt.length + response.length) / 4)
      };
      
      const updatedResults = [testResult, ...testResults];
      setTestResults(updatedResults);
      saveTestHistory(updatedResults);
      
      toast({
        description: 'Prompt test completed successfully!',
      });
    } catch (error) {
      console.error('Error running test:', error);
      toast({
        description: 'Failed to run prompt test',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const stopTest = () => {
    if (streamRef.current) {
      clearInterval(streamRef.current);
      streamRef.current = null;
    }
    setIsTesting(false);
    setIsStreaming(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      description: 'Copied to clipboard!',
    });
  };

  const downloadResults = () => {
    const dataStr = JSON.stringify(testResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prompt-test-results-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearHistory = () => {
    setTestResults([]);
    saveTestHistory([]);
    toast({
      description: 'Test history cleared!',
    });
  };

  const estimatedCost = (prompt.length + (parameters.maxTokens || 1000)) / 1000 * selectedModel.costPer1kTokens;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl text-foreground">AI Prompt Tester</h2>
          <p className="text-muted-foreground">
            Test your prompts with different AI models and parameters
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadResults}
            disabled={testResults.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                <span>Prompt Input</span>
              </CardTitle>
              <CardDescription>
                Enter your prompt and configure testing parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter your AI prompt here..."
                  className="min-h-[120px] mt-1"
                  rows={5}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="model">AI Model</Label>
                  <Select
                    value={selectedModel.id}
                    onValueChange={(value) => setSelectedModel(AI_MODELS.find(m => m.id === value) || AI_MODELS[0])}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODELS.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center space-x-2">
                            <span>{model.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {model.provider}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="maxTokens">Max Tokens</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    value={parameters.maxTokens}
                    onChange={(e) => setParameters({ ...parameters, maxTokens: parseInt(e.target.value) || 1000 })}
                    className="mt-1"
                    min={1}
                    max={selectedModel.maxTokens}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Max: {selectedModel.maxTokens.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="temperature">Temperature: {parameters.temperature}</Label>
                  <Slider
                    id="temperature"
                    value={[parameters.temperature]}
                    onValueChange={([value]) => setParameters({ ...parameters, temperature: value })}
                    max={2}
                    min={0}
                    step={0.1}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {parameters.temperature < 0.5 ? 'Focused' : parameters.temperature > 1.5 ? 'Creative' : 'Balanced'}
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="topP">Top P: {parameters.topP}</Label>
                  <Slider
                    id="topP"
                    value={[parameters.topP]}
                    onValueChange={([value]) => setParameters({ ...parameters, topP: value })}
                    max={1}
                    min={0}
                    step={0.05}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Nucleus sampling
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="streamResponse"
                    checked={parameters.streamResponse}
                    onCheckedChange={(checked) => setParameters({ ...parameters, streamResponse: checked })}
                  />
                  <Label htmlFor="streamResponse">Stream Response</Label>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="text-sm">
                  <span className="text-muted-foreground">Estimated Cost: </span>
                  <span className="font-medium">${estimatedCost.toFixed(4)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {isTesting ? (
                    <Button onClick={stopTest} variant="destructive">
                      <Square className="h-4 w-4 mr-2" />
                      Stop
                    </Button>
                  ) : (
                    <Button onClick={runTest} disabled={!prompt.trim()}>
                      <Play className="h-4 w-4 mr-2" />
                      Test Prompt
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bot className="h-5 w-5 text-blue-500" />
                <span>AI Response</span>
                {isStreaming && (
                  <Badge variant="secondary" className="animate-pulse">
                    Streaming...
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentResponse ? (
                <div className="space-y-4">
                  <div className="p-4 bg-muted/30 rounded-lg min-h-[200px]">
                    <div className="whitespace-pre-wrap text-foreground">
                      {currentResponse}
                      {isStreaming && <span className="animate-pulse">▋</span>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Model: {selectedModel.name} • Tokens: ~{Math.ceil((prompt.length + currentResponse.length) / 4)}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(currentResponse)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Response
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Run a test to see AI responses here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-green-500" />
                <span>Test History</span>
              </CardTitle>
              <CardDescription>
                Recent prompt tests and results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {testResults.slice(0, 5).map((result) => (
                  <div key={result.id} className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm text-foreground line-clamp-2">
                        {result.prompt.substring(0, 50)}...
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(result.response)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center space-x-2">
                        <span>{result.model}</span>
                        <span>•</span>
                        <span>{result.executionTime}ms</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span>{result.timestamp.split('T')[0]}</span>
                        <span>•</span>
                        <span>{result.tokenCount} tokens</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {testResults.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No test history yet</p>
                  </div>
                )}
                
                {testResults.length > 5 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setTestResults(testResults.slice(0, 5))}
                  >
                    Show Less
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-purple-500" />
                <span>Model Info</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium text-sm">{selectedModel.name}</h4>
                <p className="text-xs text-muted-foreground">{selectedModel.provider}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Max Tokens:</span>
                  <span>{selectedModel.maxTokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Cost per 1K:</span>
                  <span>${selectedModel.costPer1kTokens}</span>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h5 className="font-medium text-sm mb-2">Capabilities:</h5>
                <div className="flex flex-wrap gap-1">
                  {selectedModel.capabilities.map((capability) => (
                    <Badge key={capability} variant="secondary" className="text-xs">
                      {capability}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>API Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="apiKey">OpenAI API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your API key is stored locally and never sent to our servers
              </p>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowSettings(false)}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
