/*:
 * @plugindesc K8s API plugin for RPG Maker MV/MZ
 * @author Cyrus Wong
 *
 * @help This is a plugin that sends ajax requests to the K8s game API.
 */

(function () {
  'use strict';
  const wrapTextLength = 55;
  const urlParams = new URLSearchParams(window.location.search);
  const game = urlParams.get('game') || 'azure-learning';
  let gameStates = {}; // Store game state per NPC
  let callCount = 0;

  const popitup = (url) => {
    console.log('open ' + url);
    let w = window.open(
      url,
      '_blank',
      'scrollbars=1,resizable=1,width=1000,height=800',
    );
    if (w == null || typeof w == 'undefined') {
      alert('Please allow popups for this site');
    }
    window.focus();
  };

  // Display the text response within the window limits
  const wrapText = (text) => {
    const words = text.split(' ');
    let wrappedText = '';
    let currentLine = '';

    for (const word of words) {
      const potentialLine = currentLine + (currentLine ? ' ' : '') + word;
      if (potentialLine.length <= wrapTextLength) {
        currentLine = potentialLine;
      } else {
        wrappedText += (wrappedText ? '\n' : '') + currentLine;
        currentLine = word;
      }
    }

    if (currentLine) {
      wrappedText += (wrappedText ? '\n' : '') + currentLine;
    }

    return wrappedText;
  };

  const getGameState = (npcName) => {
    if (!gameStates[npcName]) {
      gameStates[npcName] = {
        hasActiveTask: false,
        lastInteraction: 'NONE', // NONE, TASK_ASSIGNED, GRADING
        taskName: '',
        lastResponse: null,
        isApiCallInProgress: false,
        consecutiveTaskInteractions: 0
      };
    }
    return gameStates[npcName];
  };

  const updateGameState = (npcName, response) => {
    const state = getGameState(npcName);
    state.lastResponse = response;
    
    if (response.task_name) {
      state.taskName = response.task_name;
    }
    
    // Update state based on response
    if (response.next_game_phrase === 'TASK_ASSIGNED') {
      // If user already had an active task, increment counter (they're viewing task again)
      if (state.hasActiveTask) {
        state.consecutiveTaskInteractions++;
      }
      
      state.hasActiveTask = true;
      state.lastInteraction = 'TASK_ASSIGNED';
    } else if (response.next_game_phrase === 'READY_FOR_NEXT' || response.task_completed) {
      state.hasActiveTask = false;
      state.lastInteraction = 'NONE';
      state.taskName = '';
      state.consecutiveTaskInteractions = 0; // Reset when task is completed
    } else if (response.next_game_phrase === 'BUSY_WITH_OTHER_NPC' || response.next_game_phrase === 'WRONG_NPC_FOR_GRADING') {
      // Don't change local state for cross-NPC interactions
      state.lastInteraction = 'CROSS_NPC_INTERACTION';
    } else if (response.next_game_phrase === 'NPC_COOLDOWN' || response.next_game_phrase === 'ENCOURAGE_VARIETY') {
      // Reset counter for these states
      state.consecutiveTaskInteractions = 0;
    }
  };

  const callApi = (npcName) => {
    const state = getGameState(npcName);
    
    // Prevent multiple simultaneous API calls
    if (state.isApiCallInProgress) {
      $gameMessage.add('Please wait, I am still processing your request...');
      return;
    }
    
    state.isApiCallInProgress = true;
    
    let url;
    let isGradingCall = false;

    // Check if user has active task and this is their second consecutive interaction
    if (state.hasActiveTask && state.consecutiveTaskInteractions >= 1) {
      // User wants grading - they've seen the task and are coming back
      url = `/api/grader?game=${game}&npc=${npcName}`;
      isGradingCall = true;
      state.consecutiveTaskInteractions = 0; // Reset counter
    } else {
      // Show task details or get new task
      url = `/api/game-task?game=${game}&npc=${npcName}`;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
  
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        state.isApiCallInProgress = false; // Reset flag when call completes
        
        if (xhr.status === 200) {
          const json = JSON.parse(xhr.response);
          console.log('API Response:', json);
          
          updateGameState(npcName, json);

          // Handle general errors first - clear any waiting messages
          if (json.status !== 'OK') {
            // Clear message queue for errors to avoid confusion with waiting messages
            $gameMessage.clear();
            $gameMessage.add(wrapText(json.message || 'Something went wrong. Please try again.'));
            // Also show score and completed tasks for error responses
            if (json.score !== undefined) {
              $gameMessage.add(`Current Score: ${json.score}`);
            }
            if (json.completed_tasks !== undefined) {
              $gameMessage.add(`Completed Tasks: ${json.completed_tasks}`);
            }
            return;
          }

          // Handle special cases (only for successful responses)
          if (json.next_game_phrase === 'BUSY_WITH_OTHER_NPC') {
            $gameMessage.add(wrapText(json.message));
            if (json.additional_data && json.additional_data.activeTaskNPC) {
              $gameMessage.add(`Active task: "${json.additional_data.activeTaskName}" with ${json.additional_data.activeTaskNPC}`);
            }
            return;
          }

          if (json.next_game_phrase === 'WRONG_NPC_FOR_GRADING') {
            $gameMessage.add(wrapText(json.message));
            return;
          }

          if (json.next_game_phrase === 'ENCOURAGE_VARIETY') {
            $gameMessage.add(wrapText(json.message));
            if (json.additional_data && json.additional_data.suggestion) {
              $gameMessage.add(json.additional_data.suggestion);
            }
            return;
          }

          if (json.next_game_phrase === 'NPC_COOLDOWN') {
            $gameMessage.add(wrapText(json.message));
            if (json.additional_data && json.additional_data.cooldownMinutes !== undefined) {
              $gameMessage.add(`⏰ Wait ${json.additional_data.cooldownMinutes} more minutes`);
            }
            return;
          }

          // Show completion message for grading
          if (isGradingCall) {
            $gameMessage.add('✅ Grading completed!');
          }

          // Show message
          if (json.message) {
            $gameMessage.add(wrapText(json.message));
          }

          // Handle URLs
          if (json.easter_egg_url) {
            popitup(json.easter_egg_url);
          }

          // Show additional information
          if (json.score !== undefined) {
            $gameMessage.add(`Current Score: ${json.score}`);
          }
          if (json.completed_tasks !== undefined) {
            $gameMessage.add(`Completed Tasks: ${json.completed_tasks}`);
          }

          // Show task completion celebration
          if (json.task_completed) {
            $gameMessage.add('🎉 Congratulations! Task completed! 🎉');
            $gameMessage.add('Talk to me again for your next challenge!');
            if (json.easter_egg_url) {
              popitup(json.easter_egg_url);
            }
          }

          // Show test results if available (for failed attempts)
          if (json.additional_data && json.additional_data.testResults) {
            const passed = json.additional_data.passedTests || 0;
            const total = json.additional_data.totalTests || 0;
            $gameMessage.add(`Test Results: ${passed}/${total} tests passed`);
            if (passed < total) {
              $gameMessage.add('Please fix the issues and talk to me again.');
            }
          }

          // Show next steps (only for successful responses)
          if (json.status === 'OK') {
            if (json.next_game_phrase === 'TASK_ASSIGNED' && !isGradingCall) {
              $gameMessage.add('Complete this task and come back to me for grading!');
            } else if (json.next_game_phrase === 'ALL_COMPLETED') {
              $gameMessage.add('🏆 You are an Azure master! Well done! 🏆');
            }
          }

        } else {
          $gameMessage.add('Sorry, I cannot connect to the server right now!');
          console.error('API Error:', xhr.status, xhr.statusText);
        }
      }
    };
    
    xhr.onerror = function() {
      state.isApiCallInProgress = false; // Reset flag on error
      $gameMessage.add('Network error occurred. Please check your connection.');
      console.error('Network error in API call');
    };
    
    xhr.send();
  };

  const _Game_Interpreter_pluginCommand =
    Game_Interpreter.prototype.pluginCommand;
  Game_Interpreter.prototype.pluginCommand = function (command, args) {
    _Game_Interpreter_pluginCommand.call(this, command, args);
    if (command === 'NpcK8sPluginCommand') {
      const npcName = args[0];
      console.log('NpcK8sPluginCommand Called by ' + npcName);
      callApi(npcName);
    }
  };

  // Add a global function to reset game state (for debugging)
  window.resetGameState = function(npcName) {
    if (npcName) {
      delete gameStates[npcName];
      console.log(`Reset game state for ${npcName}`);
    } else {
      gameStates = {};
      console.log('Reset all game states');
    }
  };

  // Add a global function to check game state (for debugging)
  window.checkGameState = function(npcName) {
    if (npcName) {
      console.log(`Game state for ${npcName}:`, gameStates[npcName]);
    } else {
      console.log('All game states:', gameStates);
    }
  };
})();
