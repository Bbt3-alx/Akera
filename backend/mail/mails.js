import { mailtrapClient, sender } from "./mailtrapConfig.js";
import {
  VERIFICATION_EMAIL_TEMPLATE,
  PASSWORD_RESET_SUCCESS_TEMPLATE,
  PASSWORD_RESET_REQUEST_TEMPLATE,
} from "./emailTemplates.js";

export const sendVerificationEmail = async (email, verificationToken) => {
  const recipient = [{ email }];

  try {
    const response = await mailtrapClient.send({
      from: sender,
      to: recipient,
      subject: "Verify your email",
      html: VERIFICATION_EMAIL_TEMPLATE.replace(
        "{verificationCode}",
        verificationToken
      ),
      category: "Verification email",
    });

    console.log("Email sent successfully!", response);
  } catch (error) {
    console.log(`Error sending verification email: ${error}`);
    throw new Error(`Error sending verification email: ${error}`);
  }
};

export const sendWelcomeEmail = async (email, username) => {
  const recipient = [{ email }];

  try {
    const response = await mailtrapClient.send({
      from: sender,
      to: recipient,
      template_uuid: "1c1bc0ce-98d0-4ad8-b865-49296a93f55a",
      template_variables: {
        name: username,
        company_info_name: "Akera",
        company_info_address: "Hamdallaye ACI 2000",
        company_info_city: "Bamako",
        company_info_zip_code: "91094",
        company_info_country: "Mali",
      },
    });

    console.log("Welcome email sent succesfully!", response);
  } catch (error) {
    console.log(`Error sending email: ${error}`);
    throw new Error(`Error sending email: ${error.message}`);
  }
};

export const sendResetPasswordEmail = async (email, resetUrl) => {
  const recipient = [{ email }];

  try {
    const response = await mailtrapClient.send({
      from: sender,
      to: recipient,
      subject: "Reset your password",
      html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetUrl),
      category: "Reset password",
    });
    console.log("Reset pwd email sent successfully:", response);
  } catch (error) {
    console.log(`Error something went wrong: ${error}`);
    res.status(400).josn({ status: false, message: error.message });
  }
};

export const sendResetSuccessEmail = async (email) => {
  const recipient = [{ email }];

  try {
    const response = mailtrapClient.send({
      from: sender,
      to: recipient,
      subject: "Password Reset Successfully",
      html: PASSWORD_RESET_SUCCESS_TEMPLATE,
      category: "Security Alert",
    });
    console.log("Password reset successfully:", response);
  } catch (error) {
    console.log(`Error sending password update confirmation email`);
    res.status(400).josn({ status: false, message: error.message });
  }
};
