// ユーザーIDとセッション管理
export class UserSessionManager {
    constructor() {
        this.sessionId = Math.random().toString(36).substring(2);
        this.userId = this.getUserId();
    }

    getUserId() {
        try {
            let userId = localStorage.getItem('user_id');
            if (!userId) {
                userId = Math.random().toString(36).substring(2);
                localStorage.setItem('user_id', userId);
            }
            return userId;
        } catch (e) {
            try {
                let userId = Cookies.get('user_id');
                if (!userId) {
                    userId = Math.random().toString(36).substring(2);
                    Cookies.set('user_id', userId);
                }
                return userId;
            } catch (e) {
                alert('Please enable local storage or cookies in your browser settings.');
                return null;
            }
        }
    }

    initializeIds() {
        if (this.userId) {
            document.getElementById('user_id').value = this.userId;
            document.getElementById('session_id').value = this.sessionId;
            return true;
        } else {
            this.disableForm();
            return false;
        }
    }

    disableForm() {
        $('form').off('submit');
        $('[name="user_message"]').prop('disabled', true);
        $('[name="submit"]').prop('disabled', true);
    }
}

// チャットボットの管理
export class ChatBot {
    constructor() {
        this.appUrl = "https://dvzdkwtvvz57xguvanyb4wihre0hvrqy.lambda-url.ap-south-1.on.aws/";
        this.chatButtonText = $('.chat-help-text').text();
        this.welcomeMessageShown = false;
        this.isComposing = false;

        // 設定値を直接クラスに定義
        this.config = {
            assetsPath: "/wp-content/plugins/Me_Cool_Custom_Line_Bot/static/",
            welcome_message: "Yo!",
            chat_button_text: "TUBM BOT",
            too_many_requests_message: "Too many requests. Please try again in 1 hour."
        };
    }

    initialize() {
        this.initializeChatButton();
        this.initializeTextArea();
        this.initializeFormSubmission();
    }

    initializeChatButton() {
        $('.chat-button-wrapper').click(() => {
            if ($('#chat-window').is(':visible')) {
                this.closeChatWindow();
            } else {
                this.openChatWindow();
            }
        });
    }

    closeChatWindow() {
        $('#chat-window').fadeOut(250);
        $('#chat-toggle').html(
            `<span class="chat-help-text">${this.chatButtonText}</span>` +
            `<img src="${this.config.assetsPath}icons8-bot-64.png" alt="bot" />`
        );
    }

    openChatWindow() {
        $('#chat-window').fadeIn(330);
        $('#chat-toggle').html(`<span class="chat-help-text">${this.chatButtonText}</span><span style="font-size: 25px; color: #FFF;">X</span>`);

        if (!this.welcomeMessageShown) {
            this.showWelcomeMessage();
            this.welcomeMessageShown = true;
        }

        $('textarea[name="user_message"]').focus();
    }

    initializeTextArea() {
        $('textarea[name="user_message"]').on(
            'keydown keypress compositionstart compositionend',
            this.handleTextAreaEvents.bind(this)
        );
    }

    initializeFormSubmission() {
        $('#mcc_line_bot-form').on('submit', this.handleFormSubmit.bind(this));
    }

    showTypingIndicator(finalMessage) {
        let typing_indicator = '.';
        const typing_indicator_bubble = $('<div class="ai-message-bubble"></div>');
        typing_indicator_bubble.text(typing_indicator);
        $('#chat-messages').append(typing_indicator_bubble);

        const typing_interval = setInterval(() => {
            typing_indicator = typing_indicator === '...' ? '.' : typing_indicator + '.';
            typing_indicator_bubble.text(typing_indicator);
        }, 333);

        setTimeout(() => {
            clearInterval(typing_interval);
            typing_indicator_bubble.remove();

            const bot_response = $('<div class="ai-message-bubble"></div>');
            bot_response.text(finalMessage);
            $('#chat-messages').append(bot_response);

            $('#chat-messages').animate({
                scrollTop: $('#chat-messages').prop('scrollHeight')
            }, 333);
        }, 1000);
    }

    showWelcomeMessage() {
        const welcomeMessage = this.config.welcome_message;
        this.showTypingIndicator(welcomeMessage);
    }

    handleTextAreaEvents(event) {
        // IME入力の処理
        if (event.type === 'compositionstart') {
            this.isComposing = true;
        } else if (event.type === 'compositionend') {
            this.isComposing = false;
        }

        // Enterキーの処理
        if (event.type === 'keydown' && event.key === 'Enter' && !event.shiftKey && !this.isComposing) {
            event.preventDefault();
            this.handleFormSubmit(event);
        }
    }

    handleFormSubmit(event) {
        event.preventDefault();
        const messageInput = $('textarea[name="user_message"]');
        const message = messageInput.val().trim();

        if (message) {
            // ユーザーメッセージを表示
            const userMessageBubble = $('<div class="user-message-bubble"></div>');
            userMessageBubble.text(message);
            $('#chat-messages').append(userMessageBubble);

            // ユーザーメッセージ表示後にスクロール
            $('#chat-messages').animate({
                scrollTop: $('#chat-messages').prop('scrollHeight')
            }, 100);

            // ローディングインジケーターを表示
            const loadingBubble = $('<div class="ai-message-bubble"></div>');
            $('#chat-messages').append(loadingBubble);

            // ローディングインジケーター表示後にもスクロール
            $('#chat-messages').animate({
                scrollTop: $('#chat-messages').prop('scrollHeight')
            }, 100);

            let dots = '.';
            const loadingInterval = setInterval(() => {
                dots = dots === '...' ? '.' : dots + '.';
                loadingBubble.text(dots);
            }, 333);

            // Lambda関数にメッセージを送信
            $.ajax({
                url: this.appUrl,
                type: 'POST',
                data: JSON.stringify({
                    message: message,
                    browser_id: localStorage.getItem('user_id') || Cookies.get('user_id')
                }),
                contentType: 'application/json',
                success: async (response) => {
                    // ローディングインジケーターを削除
                    clearInterval(loadingInterval);
                    loadingBubble.remove();

                    try {
                        const responseObj = typeof response === 'string' ? JSON.parse(response) : response;

                        if (responseObj && responseObj.body) {
                            const bodyObj = typeof responseObj.body === 'string' ?
                                JSON.parse(responseObj.body) : responseObj.body;

                            if (bodyObj.chunks) {
                                const botResponse = $('<div class="ai-message-bubble"></div>');
                                $('#chat-messages').append(botResponse);

                                let currentMessage = '';
                                for (let i = 0; i < bodyObj.chunks.length; i++) {
                                    const chunk = bodyObj.chunks[i];
                                    try {
                                        const dataObj = JSON.parse(chunk.replace('data: ', '').replace(/\n\n$/, ''));
                                        if (dataObj.content) {
                                            currentMessage += dataObj.content;
                                            botResponse.text(currentMessage);

                                            $('#chat-messages').animate({
                                                scrollTop: $('#chat-messages').prop('scrollHeight')
                                            }, 100);

                                            if (i < bodyObj.chunks.length - 1) {
                                                await new Promise(resolve => setTimeout(resolve, 50));
                                            }
                                        }
                                    } catch (e) {
                                        console.error(`Error processing chunk ${i}:`, e);
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        console.error('Error in response processing:', e);
                        console.error('Error stack:', e.stack);
                    }
                },
                error: (jqXHR, textStatus, errorThrown) => {
                    // ローディングインジケーターを削除
                    clearInterval(loadingInterval);
                    loadingBubble.remove();

                    console.error('Error details:', {
                        status: jqXHR.status,
                        statusText: jqXHR.statusText,
                        responseText: jqXHR.responseText
                    });

                    const errorMessage = $('<div class="ai-message-bubble error"></div>');

                    // エラーレスポンスの内容を確認
                    try {
                        const errorResponse = JSON.parse(jqXHR.responseText);
                        if (errorResponse && errorResponse.error) {
                            // サーバーからのエラーメッセージを表示
                            errorMessage.text(errorResponse.error);
                        } else {
                            // デフォルトのエラーメッセージ
                            errorMessage.text('Unknown Error Occured');
                        }
                    } catch (e) {
                        // JSONパースに失敗した場合はデフォルトメッセージ
                        errorMessage.text('Unknown Error Occured');
                    }

                    $('#chat-messages').append(errorMessage);

                    // エラーメッセージ表示後にスクロール
                    $('#chat-messages').animate({
                        scrollTop: $('#chat-messages').prop('scrollHeight')
                    }, 100);
                }
            });

            // 入力フィールドをクリア
            messageInput.val('');
        }
    }

    // 他の必要なメソッドを追加
    // handleTextAreaEvents, handleFormSubmit, showTypingIndicator など
}