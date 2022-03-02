const renderEmail = (firstName, url) => {
    const markup = `
    <div>
        <p>Hi, ${firstName}</p>
        <p>
            Forget your password? Submit a PATCH request with your new password and
            your password confirmation to: ${url}.
        </p>
        <a
            href="${url}"
            style="
                color: white;
                background-color: blue;
                text-decoration: none;
                padding: 10px 25px;
                border-radius: 5px;
                box-shadow: 0px 8px 15px rgba(0, 0, 0, 0.1);
            "
        >
            Click Here
        </a>
        <p>If you didn't forget your password, please ignore this email!</p>
    </div>
    `

    return markup
}

module.exports = renderEmail
